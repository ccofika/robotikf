import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Minus, Pencil, Trash2, RefreshCw, Wrench, Users, ArrowLeftRight } from 'lucide-react';
import { basicEquipmentAPI, techniciansAPI } from '../../services/api';
import { toast } from '../../utils/toast';
import { Btn, Sign, Avatar } from '../../security/sx/ui';
import { PageHead, Toolbar, Panel, Note, Stat, KV, Tabs } from '../../security/sx/layout';
import { Field, Input, Select, Choice, SearchField } from '../../security/sx/forms';
import Dialog from '../../security/sx/Dialog';
import { confirm } from '../../security/sx/confirm';
import { Pager, ColumnMenu, Loading } from '../../montaza/ui';
import './BasicEquipmentManager.mx.css';

const BasicEquipmentManager = () => {
  // State za osnovnu opremu
  const [basicEquipment, setBasicEquipment] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // State za formu
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    type: '',
    serialNumber: '',
    quantity: 0,
    price: 0
  });

  // State za zadužavanje
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignData, setAssignData] = useState({
    technicianId: '',
    basicEquipmentId: '',
    quantity: 1,
    isReturn: false
  });

  // State za pretragu i filtriranje
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [viewMode, setViewMode] = useState('inventory'); // 'inventory', 'technicians', 'assign'
  const [visibleColumns, setVisibleColumns] = useState({
    type: true,
    serialNumber: true,
    quantity: true,
    price: true,
    actions: true
  });

  // Paginacija
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setError('');

    try {
      const [equipmentResponse, techniciansResponse] = await Promise.all([
        basicEquipmentAPI.getAll(),
        techniciansAPI.getAll()
      ]);

      setBasicEquipment(equipmentResponse.data);
      setTechnicians(techniciansResponse.data);
    } catch (error) {
      console.error('Greška pri učitavanju podataka:', error);
      setError('Greška pri učitavanju podataka. Pokušajte ponovo.');
      toast.error('Neuspešno učitavanje podataka!');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.type.trim()) {
      toast.error('Naziv osnovne opreme je obavezan!');
      return;
    }

    if (formData.quantity < 0) {
      toast.error('Količina ne može biti negativna!');
      return;
    }

    setLoading(true);

    try {
      if (editingItem) {
        await basicEquipmentAPI.update(editingItem._id, formData);
        toast.success('Osnovna oprema je uspešno ažurirana!');
      } else {
        await basicEquipmentAPI.create(formData);
        toast.success('Osnovna oprema je uspešno dodana!');
      }

      fetchAllData();
      resetForm();
    } catch (error) {
      console.error('Greška pri čuvanju:', error);
      const errorMessage = error.response?.data?.error || 'Greška pri čuvanju osnovne opreme.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, type) => {
    if (await confirm({ title: `Da li ste sigurni da želite da obrišete osnovnu opremu "${type}"?`, tone: 'danger', confirmLabel: 'Obriši' })) {
      setLoading(true);

      try {
        await basicEquipmentAPI.delete(id);
        toast.success('Osnovna oprema je uspešno obrisana!');
        fetchAllData();
      } catch (error) {
        console.error('Greška pri brisanju:', error);
        const errorMessage = error.response?.data?.error || 'Greška pri brisanju osnovne opreme.';
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();

    if (!assignData.technicianId || !assignData.basicEquipmentId) {
      toast.error('Morate odabrati tehničara i osnovnu opremu!');
      return;
    }

    if (assignData.quantity <= 0) {
      toast.error('Količina mora biti veća od 0!');
      return;
    }

    setLoading(true);

    try {
      if (assignData.isReturn) {
        await techniciansAPI.returnBasicEquipment(assignData.technicianId, {
          basicEquipmentId: assignData.basicEquipmentId,
          quantity: parseInt(assignData.quantity, 10)
        });
        toast.success('Osnovna oprema je uspešno razdužena!');
      } else {
        await techniciansAPI.assignBasicEquipment(assignData.technicianId, {
          basicEquipmentId: assignData.basicEquipmentId,
          quantity: parseInt(assignData.quantity, 10)
        });
        toast.success('Osnovna oprema je uspešno zadužena!');
      }

      fetchAllData();
      // Keep the technician selected for multiple assignments
      resetAssignForm(true);
    } catch (error) {
      console.error('Greška pri zaduženju/razduženju:', error);
      const errorMessage = error.response?.data?.error || 'Greška pri zaduženju/razduženju osnovne opreme.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ type: '', serialNumber: '', quantity: 0, price: 0 });
    setEditingItem(null);
    setShowAddForm(false);
  };

  const resetAssignForm = (keepTechnician = false) => {
    if (keepTechnician) {
      // Keep technician selected for consecutive assignments
      setAssignData(prev => ({
        technicianId: prev.technicianId,
        basicEquipmentId: '',
        quantity: 1,
        isReturn: prev.isReturn
      }));
    } else {
      // Full reset
      setAssignData({
        technicianId: '',
        basicEquipmentId: '',
        quantity: 1,
        isReturn: false
      });
      setSelectedTechnician('');
    }
  };

  const startEdit = (item) => {
    setEditingItem(item);
    setFormData({
      type: item.type,
      serialNumber: item.serialNumber || '',
      quantity: item.quantity,
      price: item.price || 0
    });
    setShowAddForm(true);
  };

  // Filtriranje podataka
  const filteredBasicEquipment = useMemo(() => {
    return basicEquipment.filter(item => {
      const searchMatch = searchTerm === '' ||
                         item.type.toLowerCase().includes(searchTerm.toLowerCase());
      return searchMatch;
    });
  }, [basicEquipment, searchTerm]);

  const filteredTechnicians = useMemo(() => {
    return technicians.filter(tech => {
      const hasBasicEquipment = tech.basicEquipment && tech.basicEquipment.length > 0;
      const searchMatch = searchTerm === '' ||
                         tech.name.toLowerCase().includes(searchTerm.toLowerCase());
      return hasBasicEquipment && searchMatch;
    });
  }, [technicians, searchTerm]);

  // Paginacija
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredBasicEquipment.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Dostupna osnovna oprema za zadužavanje
  const availableBasicEquipment = basicEquipment.filter(item => item.quantity > 0);

  // Osnovna oprema zadužena kod selektovanog tehničara
  const selectedTechnicianEquipment = selectedTechnician ?
    technicians.find(t => t._id === selectedTechnician)?.basicEquipment || [] : [];

  const money = (n) => n.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const outOfStockCount = filteredBasicEquipment.filter(item => item.quantity === 0).length;
  const lowStockCount = filteredBasicEquipment.filter(item => item.quantity > 0 && item.quantity < 5).length;
  const pctOf = (n) => (filteredBasicEquipment.length ? Math.round(n / filteredBasicEquipment.length * 100) : 0);

  return (
    <div className="sx-page" data-testid="page-basic-equipment">
      <PageHead
        eyebrow="Montaža · Inventar"
        title="Osnovna oprema"
        lead="Upravljanje osnovnom opremom i zaduženjima"
      />

      {error && <Note tone="bad" className="mx-mb">{error}</Note>}

      <Tabs
        ariaLabel="Prikaz"
        layoutId="mx-be-tabs"
        value={viewMode}
        onChange={setViewMode}
        items={[
          { key: 'inventory', label: 'Inventar', icon: Wrench },
          { key: 'technicians', label: 'Po tehničarima', icon: Users },
          { key: 'assign', label: 'Zaduženje/Razduženje', icon: ArrowLeftRight }
        ]}
      />

      {/* Inventar */}
      {viewMode === 'inventory' && (
        <>
          <div className="sx-stats">
            <Stat label="Ukupno stavki" value={filteredBasicEquipment.length} />
            <Stat label="Nema na stanju" value={outOfStockCount} small={`${pctOf(outOfStockCount)}%`} tone={outOfStockCount ? 'bad' : null} />
            <Stat label="Malo na stanju" value={lowStockCount} small={`${pctOf(lowStockCount)}%`} tone={lowStockCount ? 'warn' : null} />
            <Stat
              label="Zaduženo"
              value={technicians.reduce((acc, tech) => acc + (tech.basicEquipment?.length || 0), 0)}
              sub={`${technicians.filter(tech => tech.basicEquipment && tech.basicEquipment.length > 0).length} tehničara`}
            />
          </div>

          <Toolbar>
            <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Pretraži po nazivu osnovne opreme..." />
            <div className="sx-toolbar__end">
              <Btn size="sm" variant="primary" icon={Plus} onClick={() => setShowAddForm(true)}>Dodaj</Btn>
              <ColumnMenu
                columns={{ type: 'Vrsta osnovne opreme', serialNumber: 'Serijski broj', quantity: 'Količina', price: 'Cena', actions: 'Akcije' }}
                visible={visibleColumns}
                onChange={(key, v) => setVisibleColumns(prev => ({ ...prev, [key]: v }))}
              />
              <Btn size="sm" icon={RefreshCw} onClick={fetchAllData} busy={loading}>Osveži</Btn>
            </div>
          </Toolbar>

          <Panel pad={false}>
            {loading ? (
              <Loading text="Učitavanje osnovne opreme..." />
            ) : (
              <>
                {currentItems.length === 0 ? (
                  <div className="sx-empty-block">
                    <b>Nema rezultata za prikazivanje</b>
                    <span>Promenite filtere ili dodajte novu osnovnu opremu</span>
                  </div>
                ) : (
                  <div className="sx-tablewrap">
                    <table className="sx-table" data-testid="basic-equipment-table">
                      <thead>
                        <tr>
                          {visibleColumns.type && <th>Vrsta osnovne opreme</th>}
                          {visibleColumns.serialNumber && <th>Serijski broj</th>}
                          {visibleColumns.quantity && <th className="is-num">Količina</th>}
                          {visibleColumns.price && <th className="is-num">Cena (RSD)</th>}
                          {visibleColumns.actions && <th className="is-end">Akcije</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {currentItems.map((item, index) => (
                          <tr key={item._id} style={{ '--i': index }}>
                            {visibleColumns.type && <td className="is-head"><b className="mx-strong">{item.type}</b></td>}
                            {visibleColumns.serialNumber && <td data-label="Serijski broj">{item.serialNumber ? <span className="sx-mono">{item.serialNumber}</span> : '-'}</td>}
                            {visibleColumns.quantity && (
                              <td data-label="Količina" className="is-num">
                                {item.quantity === 0 ? <Sign tone="bad">{item.quantity}</Sign>
                                  : item.quantity < 5 ? <Sign tone="warn">{item.quantity}</Sign>
                                    : <span className="sx-mono">{item.quantity}</span>}
                              </td>
                            )}
                            {visibleColumns.price && <td data-label="Cena (RSD)" className="is-num">{money(item.price || 0)}</td>}
                            {visibleColumns.actions && (
                              <td className="is-actions is-end">
                                <div className="sx-rowacts">
                                  <Btn size="sm" variant="ghost" icon={Pencil} onClick={() => startEdit(item)}>Izmeni</Btn>
                                  <Btn size="sm" variant="ghost" icon={Trash2} className="mx-danger" onClick={() => handleDelete(item._id, item.type)} disabled={loading}>Obriši</Btn>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <Pager page={currentPage} total={filteredBasicEquipment.length} perPage={itemsPerPage} onPage={paginate} />
              </>
            )}
          </Panel>

          {/* Dodavanje i izmena (ranije forma iznad tabele); dugmad su kao ranije "submit" dugmad forme (Odustani je prvo) */}
          <Dialog
            open={showAddForm}
            onClose={resetForm}
            eyebrow="Osnovna oprema"
            title={editingItem ? 'Izmeni osnovnu opremu' : 'Dodaj novu osnovnu opremu'}
            testId="basic-equipment-dialog"
            footer={<>
              <Btn type="submit" form="mx-be-form" variant="ghost" onClick={resetForm}>Odustani</Btn>
              <Btn type="submit" form="mx-be-form" variant="primary" onClick={handleSubmit} busy={loading}>
                {loading ? 'Čuvanje...' : editingItem ? 'Ažuriraj' : 'Dodaj'}
              </Btn>
            </>}
          >
            <form id="mx-be-form" onSubmit={handleSubmit} className="sx-form">
              <Field label="Vrsta osnovne opreme:" htmlFor="type">
                <Input
                  type="text"
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  placeholder="Unesite vrstu osnovne opreme"
                  disabled={loading}
                  autoFocus
                  required
                />
              </Field>
              <Field label="Serijski broj (S/N):" htmlFor="serialNumber">
                <Input
                  type="text"
                  id="serialNumber"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
                  placeholder="Unesite serijski broj"
                  disabled={loading}
                  mono
                />
              </Field>
              <Field label="Količina:" htmlFor="quantity">
                <Input
                  type="number"
                  id="quantity"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                  min="0"
                  disabled={loading}
                  required
                />
              </Field>
              <Field label="Cena (RSD):" htmlFor="price">
                <Input
                  type="number"
                  id="price"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                  min="0"
                  step="0.01"
                  disabled={loading}
                  placeholder="0.00"
                />
              </Field>
            </form>
          </Dialog>
        </>
      )}

      {/* Po tehničarima */}
      {viewMode === 'technicians' && (
        <>
          <Toolbar>
            <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Pretraži tehničare..." />
          </Toolbar>

          <Panel title="Osnovna oprema po tehničarima">
            {filteredTechnicians.length === 0 ? (
              <div className="sx-empty-block mx-be-empty">
                <b>Nema tehničara sa zaduženom osnovnom opremom</b>
              </div>
            ) : (
              <div className="mx-be-techs">
                {filteredTechnicians.map(technician => {
                  // Calculate total price for this technician
                  const totalPrice = (technician.basicEquipment || []).reduce((sum, equipment) => {
                    // Find price from inventory
                    const inventoryItem = basicEquipment.find(item => item._id === equipment.basicEquipmentId || item._id === equipment.id || item._id === equipment._id);
                    const price = inventoryItem?.price || equipment.price || 0;
                    return sum + (price * (equipment.quantity || 0));
                  }, 0);

                  return (
                    <div key={technician._id} className="mx-be-tech">
                      <div className="mx-be-tech__head">
                        <div className="sx-cell sx-cell--who">
                          <Avatar name={technician.name} />
                          <b>{technician.name}</b>
                          <span>{technician.deletedAt ? 'Obrisan tehničar' : 'Tehničar'}</span>
                        </div>
                        <div className="mx-be-tech__total">
                          <span className="sx-label">Ukupna cena</span>
                          <b className="sx-num">{money(totalPrice)} RSD</b>
                        </div>
                      </div>

                      <div className="sx-list">
                        {(technician.basicEquipment || []).map(equipment => {
                          const inventoryItem = basicEquipment.find(item => item._id === equipment.basicEquipmentId || item._id === equipment.id || item._id === equipment._id);
                          const itemPrice = inventoryItem?.price || equipment.price || 0;
                          const itemTotalPrice = itemPrice * (equipment.quantity || 0);

                          return (
                            <div key={equipment._id} className="sx-item mx-be-item">
                              <div className="sx-item__main">
                                <b>{equipment.type}</b>
                                {itemPrice > 0 && <span>{money(itemPrice)} RSD/kom</span>}
                              </div>
                              <div className="sx-item__side">
                                {itemTotalPrice > 0 && <span className="mx-be-sum">{money(itemTotalPrice)} RSD</span>}
                                <span className="sx-tag sx-mono">{equipment.quantity}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </>
      )}

      {/* Zaduženje / razduženje; oba dugmeta su kao ranije "submit" dugmad forme (Poništi je prvo) */}
      {viewMode === 'assign' && (
        <form onSubmit={handleAssignSubmit}>
          <Panel
            title="Zaduženje / Razduženje osnovne opreme"
            footer={<>
              <Btn type="submit" variant="ghost" onClick={resetAssignForm}>Poništi</Btn>
              <Btn
                type="submit"
                variant="primary"
                icon={assignData.isReturn ? Minus : Plus}
                onClick={handleAssignSubmit}
                busy={loading}
                disabled={!assignData.technicianId || !assignData.basicEquipmentId || assignData.quantity <= 0 || loading}
              >
                {loading ? 'Obrađuje se...' : assignData.isReturn ? 'Razduži' : 'Zaduži'}
              </Btn>
            </>}
          >
            <div className="sx-cols sx-cols--2">
              <div>
                <Field label="Tehničar:" htmlFor="mx-be-tech">
                  <Select
                    id="mx-be-tech"
                    value={assignData.technicianId}
                    onChange={(e) => {
                      setAssignData({...assignData, technicianId: e.target.value});
                      setSelectedTechnician(e.target.value);
                    }}
                    disabled={loading}
                    required
                  >
                    <option value="">Izaberite tehničara</option>
                    {technicians.filter(tech => !tech.deletedAt).map(tech => (
                      <option key={tech._id} value={tech._id}>
                        {tech.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Tip operacije:">
                  <Choice
                    size="sm"
                    label="Tip operacije"
                    layoutId="mx-be-op"
                    value={assignData.isReturn ? 'return' : 'assign'}
                    onChange={(v) => {
                      // kao radio dugme: reaguje samo na promenu izbora
                      const isReturn = v === 'return';
                      if (isReturn !== assignData.isReturn) setAssignData({...assignData, isReturn, basicEquipmentId: ''});
                    }}
                    options={[{ value: 'assign', label: 'Zaduženje' }, { value: 'return', label: 'Razduženje' }]}
                  />
                </Field>

                <Field label="Osnovna oprema:" htmlFor="mx-be-item">
                  <Select
                    id="mx-be-item"
                    value={assignData.basicEquipmentId}
                    onChange={(e) => setAssignData({...assignData, basicEquipmentId: e.target.value})}
                    disabled={loading || (!assignData.isReturn && availableBasicEquipment.length === 0) || (assignData.isReturn && selectedTechnicianEquipment.length === 0)}
                    required
                  >
                    <option value="">Izaberite osnovnu opremu</option>
                    {assignData.isReturn ? (
                      selectedTechnicianEquipment.map(equipment => (
                        <option key={equipment.id || equipment._id} value={equipment.id || equipment._id}>
                          {equipment.type} (Zaduženo: {equipment.quantity})
                        </option>
                      ))
                    ) : (
                      availableBasicEquipment.map(equipment => (
                        <option key={equipment._id} value={equipment._id}>
                          {equipment.type} (Dostupno: {equipment.quantity})
                        </option>
                      ))
                    )}
                  </Select>
                </Field>

                <Field label="Količina:" htmlFor="mx-be-qty">
                  <Input
                    type="number"
                    id="mx-be-qty"
                    min="1"
                    value={assignData.quantity}
                    onChange={(e) => setAssignData({...assignData, quantity: parseInt(e.target.value) || 1})}
                    disabled={loading || !assignData.basicEquipmentId}
                    required
                  />
                </Field>
              </div>

              <div className="mx-be-preview">
                <h4 className="sx-fieldset__title">Pregled stanja</h4>
                {selectedTechnician && (
                  <>
                    <KV items={[{ k: 'Tehničar', v: technicians.find(t => t._id === selectedTechnician)?.name }]} />
                    {selectedTechnicianEquipment.length > 0 && (
                      <div className="mx-be-current">
                        <span className="sx-label">Trenutno zadužena oprema:</span>
                        {selectedTechnicianEquipment.map(equipment => (
                          <div key={equipment._id} className="mx-be-prow">
                            <span>{equipment.type}</span>
                            <b className="sx-mono">{equipment.quantity}</b>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </Panel>
        </form>
      )}
    </div>
  );
};

export default BasicEquipmentManager;