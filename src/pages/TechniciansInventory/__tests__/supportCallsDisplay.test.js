import React from 'react';
import { render, screen } from '@testing-library/react';

const TECH_ID = '69ce8f2f4e4402dfdc4db7ce';

// react-router-dom v7 je ESM-only pa ga CRA jest ne razrešava (isti razlog
// kao u assignedAtColumn.test.js)
jest.mock('react-router-dom', () => ({
  __esModule: true,
  Link: ({ children }) => <span>{children}</span>,
  useParams: () => ({ id: TECH_ID }),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ search: '', pathname: '/technicians' })
}), { virtual: true });

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
  supportCallsAPI: apiStub(),
  logsAPI: apiStub()
}));

// eslint-disable-next-line import/first
import TechnicianDetail from '../TechnicianDetail';
// eslint-disable-next-line import/first
import { techniciansAPI, supportCallsAPI } from '../../../services/api';

const baseTechnician = {
  _id: TECH_ID, name: 'Test Tehničar', createdAt: '2026-01-01T10:00:00Z',
  equipment: [], materials: [], basicEquipment: []
};

beforeEach(() => {
  jest.clearAllMocks();
  techniciansAPI.getOne.mockResolvedValue({ data: baseTechnician });
});

describe('/technicians/:id — zbirni pregled poziva podršci', () => {
  it('prikazuje brojeve po tipu i ukupno', async () => {
    supportCallsAPI.getTechnicianSummary.mockResolvedValue({
      data: { total: 7, administrative: 5, super: 2, lastCalledAt: '2026-08-15T12:24:00Z' }
    });

    render(<TechnicianDetail />);

    expect(await screen.findByText('Pozivi podršci')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Administrativna podrška')).toBeInTheDocument();
    expect(screen.getByText('Superpodrška')).toBeInTheDocument();
    expect(supportCallsAPI.getTechnicianSummary).toHaveBeenCalledWith(TECH_ID);
  });

  it('kartica se NE prikazuje kada nema poziva', async () => {
    supportCallsAPI.getTechnicianSummary.mockResolvedValue({
      data: { total: 0, administrative: 0, super: 0, lastCalledAt: null }
    });

    render(<TechnicianDetail />);

    expect(await screen.findByText('Test Tehničar')).toBeInTheDocument();
    expect(screen.queryByText('Pozivi podršci')).not.toBeInTheDocument();
  });

  it('neuspeh summary poziva ne obara stranicu', async () => {
    supportCallsAPI.getTechnicianSummary.mockRejectedValue(new Error('fail'));

    render(<TechnicianDetail />);

    expect(await screen.findByText('Test Tehničar')).toBeInTheDocument();
    expect(screen.queryByText('Pozivi podršci')).not.toBeInTheDocument();
  });
});
