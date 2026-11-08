import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { materialsAPI } from '../../services/api';
import { toast } from '../../utils/toast';
import { Btn } from '../../security/sx/ui';
import { PageHead, Panel, Note } from '../../security/sx/layout';
import { Field, Input } from '../../security/sx/forms';
import { LinkBtn } from '../../montaza/ui';
import './EditMaterial.mx.css';

const AddMaterial = () => {
  const [formData, setFormData] = useState({
    type: '',
    quantity: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: name === 'quantity' ? parseInt(value, 10) : value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validacija
    if (!formData.type.trim()) {
      setError('Naziv materijala je obavezan!');
      return;
    }
    
    if (formData.quantity < 0) {
      setError('Količina ne može biti negativna!');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      await materialsAPI.create(formData);
      toast.success('Materijal je uspešno dodat!');
      navigate('/materials');
    } catch (error) {
      console.error('Greška pri dodavanju materijala:', error);
      setError(error.response?.data?.error || 'Greška pri dodavanju materijala. Pokušajte ponovo.');
      toast.error('Neuspešno dodavanje materijala!');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="sx-page" data-testid="page-materials-add">
      <PageHead
        eyebrow="Montaža · Inventar"
        title="Dodaj novi materijal"
        lead="Dodavanje novog materijala u inventar"
        actions={<LinkBtn to="/materials" icon={ArrowLeft}>Povratak na listu</LinkBtn>}
      />

      {/* Sačuvaj je kao ranije "submit" dugme forme sa onClick (handleSubmit sprečava dupli poziv) */}
      {/* kao ranije: uska kartica u sredini, polja jedno ispod drugog */}
      <form onSubmit={handleSubmit} className="mx-mat-form">
        <Panel
          footer={<>
            <LinkBtn to="/materials" variant="ghost">Odustani</LinkBtn>
            <Btn type="submit" variant="primary" icon={Save} onClick={handleSubmit} busy={loading}>
              {loading ? 'Čuvanje...' : 'Sačuvaj'}
            </Btn>
          </>}
        >
          {error && <Note tone="bad" className="mx-mb">{error}</Note>}
          <div className="mx-mat-fields">
            <Field label="Vrsta materijala:" htmlFor="type">
              <Input type="text" id="type" name="type" value={formData.type} onChange={handleChange} placeholder="Unesite vrstu materijala" disabled={loading} autoFocus required />
            </Field>
            <Field label="Količina:" htmlFor="quantity">
              <Input type="number" id="quantity" name="quantity" value={formData.quantity} onChange={handleChange} min="0" disabled={loading} required />
            </Field>
          </div>
        </Panel>
      </form>
    </div>
  );
};

export default AddMaterial;