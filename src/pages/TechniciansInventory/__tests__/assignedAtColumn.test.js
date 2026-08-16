import React from 'react';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';

const TECH_ID = '69ce8f2f4e4402dfdc4db7ce';

// react-router-dom v7 je ESM-only pa ga CRA jest ne razrešava; za ovaj test
// nam treba samo da se komponente iscrtaju, ne i stvarna navigacija.
jest.mock('react-router-dom', () => ({
  __esModule: true,
  Link: ({ children }) => <span>{children}</span>,
  useParams: () => ({ id: TECH_ID }),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ search: '', pathname: '/equipment' })
}), { virtual: true });

// services/api.js uvozi axios (ESM) — mockujemo ga fabrikom da se pravi modul
// nikad ne učita. Proxy vraća jest.fn() za bilo koji API poziv koji komponenta
// pozove, pa test ne mora da nabraja sve metode.
const apiStub = () => new Proxy({}, {
  get: (target, prop) => {
    if (typeof prop === 'symbol') return undefined;
    if (!(prop in target)) {
      target[prop] = jest.fn(() => Promise.resolve({ data: [] }));
    }
    return target[prop];
  }
});

jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: apiStub(),
  techniciansAPI: apiStub(),
  equipmentAPI: apiStub(),
  reviewsAPI: apiStub(),
  workOrdersAPI: apiStub(),
  logsAPI: apiStub()
}));

// eslint-disable-next-line import/first
import TechnicianDetail from '../TechnicianDetail';
// eslint-disable-next-line import/first
import AssignEquipment from '../AssignEquipment';
// eslint-disable-next-line import/first
import EquipmentList from '../../CentralInventory/EquipmentList';
// eslint-disable-next-line import/first
import { techniciansAPI, equipmentAPI } from '../../../services/api';

const STAMPED = '2026-08-15T12:24:27.773Z'; // -> 15.08.2026. 14:24 (Europe/Belgrade)
const LEGACY_TEXT = 'Zaduženo pre uvođenja praćenja';

const stampedItem = {
  _id: '1', id: '1', category: 'ONT', description: 'ONT uređaj',
  serialNumber: 'sn-stamped', location: `tehnicar-${TECH_ID}`,
  status: 'assigned', assignedTo: TECH_ID, assignedAt: STAMPED
};
const legacyItem = {
  _id: '2', id: '2', category: 'STB', description: 'STB uređaj',
  serialNumber: 'sn-legacy', location: `tehnicar-${TECH_ID}`,
  status: 'assigned', assignedTo: TECH_ID, assignedAt: null
};
const warehouseItem = {
  _id: '3', id: '3', category: 'Kartica', description: 'Kartica',
  serialNumber: 'sn-magacin', location: 'magacin',
  status: 'available', assignedTo: null, assignedAt: null
};

// Vrati red tabele koji sadrži dati serijski broj.
const rowFor = (serial) => screen.getByText(serial).closest('tr');

// Naslovi kolona te tabele, po redosledu.
const headersOf = (row) =>
  within(row.closest('table')).getAllByRole('columnheader').map(th => th.textContent.trim());

// Indeks kolone "Zaduženo" mora da odgovara indeksu ćelije sa vrednošću.
const assertColumnAligned = (row, expectedText) => {
  const headers = headersOf(row);
  const idx = headers.indexOf('Zaduženo');
  expect(idx).toBeGreaterThan(-1);
  const cells = within(row).getAllByRole('cell');
  expect(cells).toHaveLength(headers.length);
  expect(cells[idx].textContent.trim()).toBe(expectedText);
};

beforeEach(() => jest.clearAllMocks());

describe('/technicians/:id — tabela "Zadužena oprema"', () => {
  const renderPage = async () => {
    techniciansAPI.getOne.mockResolvedValue({
      data: {
        _id: TECH_ID, name: 'Test Tehničar', createdAt: STAMPED,
        equipment: [stampedItem, legacyItem], materials: [], basicEquipment: []
      }
    });
    techniciansAPI.getAll.mockResolvedValue({ data: [] });
    render(<TechnicianDetail />);
    expect(await screen.findByText('sn-stamped')).toBeInTheDocument();
  };

  it('prikazuje tačan datum i vreme za opremu sa pečatom', async () => {
    await renderPage();
    assertColumnAligned(rowFor('sn-stamped'), '15.08.2026. 14:24');
  });

  it('prikazuje objašnjenje za staru opremu bez pečata', async () => {
    await renderPage();
    assertColumnAligned(rowFor('sn-legacy'), LEGACY_TEXT);
  });
});

describe('/technicians/:id/assign-equipment — tab za razduženje', () => {
  const renderPage = async () => {
    techniciansAPI.getOne.mockResolvedValue({ data: { _id: TECH_ID, name: 'Test Tehničar' } });
    techniciansAPI.getAll.mockResolvedValue({ data: [] });
    equipmentAPI.getAll.mockResolvedValue({ data: [stampedItem, legacyItem, warehouseItem] });
    render(<AssignEquipment />);
    expect(await screen.findByText('sn-magacin')).toBeInTheDocument();
  };

  it('tab za zaduženje NEMA kolonu "Zaduženo" (oprema je u magacinu)', async () => {
    await renderPage();
    expect(screen.queryByRole('columnheader', { name: 'Zaduženo' })).not.toBeInTheDocument();
  });

  it('tab za razduženje prikazuje pečat i legacy tekst', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Razduži opremu|Razduženje/i }));
    const stampedRow = await screen.findByText('sn-stamped');
    assertColumnAligned(stampedRow.closest('tr'), '15.08.2026. 14:24');
    assertColumnAligned(rowFor('sn-legacy'), LEGACY_TEXT);
  });

  // Optimistički update premešta opremu iz magacina u listu zaduženih pre nego
  // što se lista osveži sa servera. Bez `assignedAt` pečata i u tom koraku, tek
  // zadužena oprema bi se prikazala kao stara oprema bez praćenja.
  it('tek zadužena oprema odmah dobija vreme, ne legacy tekst', async () => {
    await renderPage();
    techniciansAPI.assignEquipment.mockResolvedValue({ data: {} });

    fireEvent.click(screen.getByText('sn-magacin').closest('tr'));
    // "Zaduži opremu" je i naziv taba i akcionog dugmeta — akciono je poslednje u DOM-u.
    const assignButtons = screen.getAllByRole('button', { name: 'Zaduži opremu' });
    fireEvent.click(assignButtons[assignButtons.length - 1]);

    await waitFor(() => expect(techniciansAPI.assignEquipment).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /Razduži opremu|Razduženje/i }));
    const row = (await screen.findByText('sn-magacin')).closest('tr');

    const headers = headersOf(row);
    const cell = within(row).getAllByRole('cell')[headers.indexOf('Zaduženo')];
    expect(cell.textContent).not.toBe(LEGACY_TEXT);
    expect(cell.textContent).toMatch(/^\d{2}\.\d{2}\.\d{4}\. \d{2}:\d{2}$/);
  });
});

describe('/equipment — glavna tabela opreme', () => {
  const renderPage = async () => {
    equipmentAPI.getDisplay.mockImplementation((params) => {
      if (params?.statsOnly) return Promise.resolve({ data: { total: 3, inWarehouse: 1, assigned: 2 } });
      return Promise.resolve({
        data: {
          data: [stampedItem, legacyItem, warehouseItem],
          pagination: { currentPage: 1, totalPages: 1, totalCount: 3, limit: 50, hasNextPage: false, hasPreviousPage: false },
          performance: { queryTime: 1, resultsPerPage: 3 }
        }
      });
    });
    equipmentAPI.getCategories = jest.fn().mockResolvedValue({ data: [] });
    equipmentAPI.getLocations = jest.fn().mockResolvedValue({ data: [] });
    techniciansAPI.getAll.mockResolvedValue({ data: [] });
    render(<EquipmentList />);
    expect(await screen.findByText('sn-stamped')).toBeInTheDocument();
  };

  it('pečat, legacy i nezadužena oprema u istoj tabeli', async () => {
    await renderPage();
    assertColumnAligned(rowFor('sn-stamped'), '15.08.2026. 14:24');
    assertColumnAligned(rowFor('sn-legacy'), LEGACY_TEXT);
    assertColumnAligned(rowFor('sn-magacin'), '—'); // u magacinu = nije zaduženo
  });
});
