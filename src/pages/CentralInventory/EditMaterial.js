import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { materialsAPI } from '../../services/api';
import { toast } from '../../utils/toast';
import { Btn } from '../../security/sx/ui';
import { PageHead, Panel, Note } from '../../security/sx/layout';
import { Field, Input } from '../../security/sx/forms';
import { confirm } from '../../security/sx/confirm';
import { LinkBtn, Loading } from '../../montaza/ui';
import './EditMaterial.mx.css';

const EditMaterial = () => {
  const [formData, setFormData] = useState({
    type: '',
    quantity: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { id } = useParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchMaterialData();
  }, [id]);

  const fetchMaterialData = async () => {
    setLoading(true);

    try {
      const response = await materialsAPI.getOne(id);
      setFormData({
        type: response.data.type,
        quantity: response.data.quantity
      });
    } catch (error) {
      console.error('Greška pri učitavanju materijala:', error);
      setError('Materijal nije pronađen ili je došlo do greške pri učitavanju.');
      toast.error('Greška pri učitavanju materijala!');
    } finally {
      setLoading(false);
    }
  };
  
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
      await materialsAPI.update(id, formData);
      toast.success('Materijal je uspešno ažuriran!');
      navigate('/materials');
    } catch (error) {
      console.error('Greška pri ažuriranju materijala:', error);
      setError(error.response?.data?.error || 'Greška pri ažuriranju materijala. Pokušajte ponovo.');
      toast.error('Neuspešno ažuriranje materijala!');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (await confirm({ title: `Da li ste sigurni da želite da obrišete materijal "${formData.type}"?`, tone: 'danger', confirmLabel: 'Obriši' })) {
      setLoading(true);

      try {
        await materialsAPI.delete(id);
        toast.success('Materijal je uspešno obrisan!');
        navigate('/materials');
      } catch (error) {
        console.error('Greška pri brisanju materijala:', error);
        const errorMessage = error.response?.data?.error || 'Greška pri brisanju materijala.';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    }
  };
  
  const head = (
    <PageHead
      eyebrow="Montaža · Inventar"
      title="Izmeni materijal"
      lead="Uređivanje postojeg materijala"
      actions={<LinkBtn to="/materials" icon={ArrowLeft}>Povratak na listu</LinkBtn>}
    />
  );

  if (loading && formData.type === '') {
    return (
      <div className="sx-page" data-testid="page-materials-edit">
        {head}
        <Panel pad={false}><Loading text="Učitavanje materijala..." /></Panel>
      </div>
    );
  }
  
  return (
    <div className="sx-page" data-testid="page-materials-edit">
      {head}

      {/* Sačuvaj je kao ranije "submit" dugme forme sa onClick; Obriši je obično dugme (potvrda je sada asinhrona) */}
      {/* kao ranije: uska kartica u sredini, polja jedno ispod drugog, Obriši levo, Odustani i Sačuvaj desno */}
      <form onSubmit={handleSubmit} className="mx-mat-form mx-me-form">
        <Panel
          footer={<>
            <Btn variant="danger" icon={Trash2} onClick={handleDelete} disabled={loading}>Obriši</Btn>
            <LinkBtn to="/materials" variant="ghost" className="mx-right">Odustani</LinkBtn>
            <Btn type="submit" variant="primary" icon={Save} onClick={handleSubmit} busy={loading}>
              {loading ? 'Čuvanje...' : 'Sačuvaj izmene'}
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

export default EditMaterial;