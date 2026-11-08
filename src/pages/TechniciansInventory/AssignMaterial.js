import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Minus } from 'lucide-react';
import { toast } from '../../utils/toast';
import { techniciansAPI, materialsAPI } from '../../services/api';
import { Btn, Sign } from '../../security/sx/ui';
import { PageHead, Panel, Note, Tabs } from '../../security/sx/layout';
import { Field, Input, Select } from '../../security/sx/forms';
import { Loading, LinkBtn } from '../../montaza/ui';

const AssignMaterial = () => {
  const [technician, setTechnician] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [technicianMaterials, setTechnicianMaterials] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('assign'); // 'assign' ili 'return'
  const { id } = useParams();

  useEffect(() => {
    fetchData();
  }, [id]);

    const fetchData = async () => {
    setLoading(true);
    setError('');

    try {
      const [techResponse, materialsResponse] = await Promise.all([
        techniciansAPI.getOne(id),
        materialsAPI.getAll()
      ]);

      setTechnician(techResponse.data);
      setMaterials(materialsResponse.data);
      setTechnicianMaterials(techResponse.data.materials || []);

      // Postavi prvi materijal kao selektovan
      if (materialsResponse.data.length > 0 && activeTab === 'assign') {
        setSelectedMaterial(materialsResponse.data[0]._id);
      } else if (techResponse.data.materials?.length > 0 && activeTab === 'return') {
        setSelectedMaterial(techResponse.data.materials[0].id || techResponse.data.materials[0]._id);
      }

    } catch (error) {
      console.error('Greška pri učitavanju podataka:', error);
      setError('Došlo je do greške pri učitavanju podataka.');
      toast.error('Greška pri učitavanju podataka!');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignMaterial = async () => {
    if (!selectedMaterial) {
      toast.warning('Niste odabrali materijal!');
      return;
    }

    if (quantity <= 0) {
      toast.warning('Količina mora biti veća od 0!');
      return;
    }

    setLoading(true);

    try {
      await techniciansAPI.assignMaterial(id, {
        materialId: selectedMaterial,
        quantity: parseInt(quantity, 10)
      });
      toast.success(`Uspešno ste zadužili materijal tehničaru!`);
      fetchData();
      setQuantity(1);
    } catch (error) {
      console.error('Greška pri zaduživanju materijala:', error);
      toast.error(error.response?.data?.error || 'Greška pri zaduživanju materijala!');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnMaterial = async () => {
    if (!selectedMaterial) {
      toast.warning('Niste odabrali materijal!');
      return;
    }

    if (quantity <= 0) {
      toast.warning('Količina mora biti veća od 0!');
      return;
    }

    // Provera da li tehničar ima dovoljno materijala
    const techMaterial = technicianMaterials.find(m => m._id === selectedMaterial || m.id === selectedMaterial);
    if (!techMaterial || techMaterial.quantity < quantity) {
      toast.error(`Tehničar nema dovoljno materijala za razduženje. Dostupno: ${techMaterial?.quantity || 0}`);
      return;
    }

    setLoading(true);

    try {
      await techniciansAPI.returnMaterial(id, {
        materialId: selectedMaterial,
        quantity: parseInt(quantity, 10)
      });
      toast.success(`Uspešno ste razdužili materijal!`);
      fetchData();
      setQuantity(1);
    } catch (error) {
      console.error('Greška pri razduživanju materijala:', error);
      toast.error(error.response?.data?.error || 'Greška pri razduživanju materijala!');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedMaterial('');  // Reset selekcije
    setQuantity(1);
  };

  if (loading && !technician) {
    return (
      <div className="sx-page" data-testid="page-technician-assign-material">
        <Loading text="Učitavanje..." />
      </div>
    );
  }

  // Filtriranje materijala zavisno od aktivnog taba
  const availableMaterials = materials.filter(m => m.quantity > 0);
  const isAssign = activeTab === 'assign';

  return (
    <div className="sx-page" data-testid="page-technician-assign-material">
      <PageHead
        eyebrow="Montaža · Tehničari"
        title="Zaduženje/Razduženje materijala"
        lead="Upravljanje materijalima tehničara"
        actions={<LinkBtn to={`/technicians/${id}`} icon={ArrowLeft}>Nazad na detalje</LinkBtn>}
      />

      {error && <Note tone="bad" className="mx-mb">{error}</Note>}

      {technician && <Panel title={technician.name} sub="Tehničar" className="mx-mb" />}

      <Tabs
        items={[
          { key: 'assign', label: 'Zaduži materijal', icon: Plus },
          { key: 'return', label: 'Razduži materijal', icon: Minus, disabled: technicianMaterials.length === 0 }
        ]}
        value={activeTab}
        onChange={handleTabChange}
      />

      <div className="sx-stack">
        <Panel
          title={isAssign ? 'Zaduženje materijala' : 'Razduženje materijala'}
          footer={isAssign ? (
            availableMaterials.length === 0 ? (
              <span className="sx-muted">Nema dostupnih materijala u magacinu</span>
            ) : (
              <Btn variant="primary" icon={Plus} onClick={handleAssignMaterial} disabled={loading || !selectedMaterial || quantity <= 0}>
                Zaduži materijal
              </Btn>
            )
          ) : (
            technicianMaterials.length === 0 ? (
              <span className="sx-muted">Tehničar nema zadužen nijedan materijal</span>
            ) : (
              <Btn variant="primary" icon={Minus} onClick={handleReturnMaterial} disabled={loading || !selectedMaterial || quantity <= 0}>
                Razduži materijal
              </Btn>
            )
          )}
        >
          <div className="sx-form">
            <Field label="Materijal:" htmlFor="material">
              <Select
                id="material"
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
                disabled={loading || (isAssign && availableMaterials.length === 0) || (!isAssign && technicianMaterials.length === 0)}
              >
                <option value="">Izaberite materijal</option>
                {isAssign ? (
                  availableMaterials.map(material => (
                    <option key={material._id} value={material._id}>
                      {material.type} (Dostupno: {material.quantity})
                    </option>
                  ))
                ) : (
                  technicianMaterials.map(material => (
                    <option key={material.id || material._id} value={material.id || material._id}>
                      {material.type} (Zaduženo: {material.quantity})
                    </option>
                  ))
                )}
              </Select>
            </Field>

            <Field label="Količina:" htmlFor="quantity">
              <Input
                type="number"
                id="quantity"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                disabled={loading || !selectedMaterial}
              />
            </Field>
          </div>
        </Panel>

        <Panel pad={false} title="Pregled stanja materijala">
          <div className="sx-tablewrap">
            <table className="sx-table">
              <thead>
                <tr>
                  <th>Vrsta</th>
                  <th className="is-num">U magacinu</th>
                  <th className="is-num">Zaduženo</th>
                  <th className="is-num">Ukupno</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((material, index) => {
                  const techAssigned = technicianMaterials.find(m => m._id === material._id || m.id === material._id)?.quantity || 0;
                  return (
                    <tr key={material._id} style={{ '--i': index }}>
                      <td className="is-head"><b className="mx-strong">{material.type}</b></td>
                      <td data-label="U magacinu" className="is-num">
                        {material.quantity <= 0 ? <Sign tone="bad">{material.quantity}</Sign>
                          : material.quantity < 5 ? <Sign tone="warn">{material.quantity}</Sign>
                            : <span className="sx-mono">{material.quantity}</span>}
                      </td>
                      <td data-label="Zaduženo" className="is-num">
                        <span className={techAssigned > 0 ? 'mx-strong' : 'sx-faint'}>{techAssigned}</span>
                      </td>
                      <td data-label="Ukupno" className="is-num">{material.quantity + techAssigned}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default AssignMaterial;
