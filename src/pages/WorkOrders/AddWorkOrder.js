import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from '../../utils/toast';
import { workOrdersAPI, techniciansAPI } from '../../services/api';
import { localYmd } from '../../utils/localDate';
import { Btn } from '../../security/sx/ui';
import { PageHead, Panel, Note } from '../../security/sx/layout';
import { Field, Input, Select, Textarea, DateField, TimeField } from '../../security/sx/forms';
import { LinkBtn } from '../../montaza/ui';

const AddWorkOrder = () => {
  const [formData, setFormData] = useState({
    date: localYmd(), // Današnji datum
    time: '09:00',
    municipality: '',
    address: '',
    type: '',
    technicianId: '',
    technician2Id: '',
    details: '',
    comment: '',
    // Dodati novi atributi iz workorders.json
    technology: '',
    tim: 'robotik',
    tisId: '',
    userName: '',
    userPhone: '',
    tisJobId: '',
    additionalJobs: ''
  });
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  useEffect(() => {
    // Učitavanje liste tehničara
    const fetchTechnicians = async () => {
      try {
        const response = await techniciansAPI.getAll();
        setTechnicians(response.data.filter(t => !t.deletedAt));
      } catch (err) {
        console.error('Greška pri učitavanju tehničara:', err);
        toast.error('Neuspešno učitavanje tehničara!');
      }
    };
    
    fetchTechnicians();
  }, []);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validacija
    if (!formData.municipality || !formData.address || !formData.type) {
      setError('Opština, adresa i tip instalacije su obavezni!');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Dodavanje administratorskih podataka za logovanje
      const dataToSend = {
        ...formData,
        adminId: 'admin-system', // Placeholder za admin ID
        adminName: 'Sistem Administrator'
      };
      
      await workOrdersAPI.create(dataToSend);
      toast.success('Radni nalog je uspešno dodat!');
      navigate('/work-orders');
    } catch (error) {
      console.error('Greška pri dodavanju radnog naloga:', error);
      setError(error.response?.data?.error || 'Greška pri dodavanju radnog naloga. Pokušajte ponovo.');
      toast.error('Neuspešno dodavanje radnog naloga!');
    } finally {
      setLoading(false);
    }
  };
  
  // Polja koja ne šalju događaj (datum, vreme) idu kroz isti handleChange
  const setField = (name) => (value) => handleChange({ target: { name, value } });

  return (
    <div className="sx-page" data-testid="page-work-orders-add">
      <PageHead
        eyebrow="Montaža · Radni nalozi"
        title="Dodaj novi radni nalog"
        lead="Kreiranje novog radnog naloga za tehničare"
        actions={<LinkBtn to="/work-orders" icon={ArrowLeft}>Povratak na listu</LinkBtn>}
      />

      {/* Dugme Sačuvaj ostaje sa onClick kao ranije; noValidate: poruka o obaveznim poljima je naša, ne iz pregledača */}
      <form onSubmit={handleSubmit} noValidate>
        <Panel
          footer={<>
            <LinkBtn to="/work-orders" variant="ghost">Odustani</LinkBtn>
            <Btn type="submit" variant="primary" icon={Save} disabled={loading} onClick={handleSubmit} data-testid="work-order-save">
              {loading ? 'Čuvanje...' : 'Sačuvaj'}
            </Btn>
          </>}
        >
          {error && <Note tone="bad" className="mx-mb">{error}</Note>}

          {/* Date and Time */}
          <div className="sx-form">
            <Field label="Datum" htmlFor="date">
              <DateField id="date" value={formData.date} onChange={setField('date')} disabled={loading} />
            </Field>
            <Field label="Vreme" htmlFor="time">
              <TimeField id="time" value={formData.time} onChange={setField('time')} disabled={loading} />
            </Field>
          </div>

          <Field label="Opština" htmlFor="municipality">
            <Input id="municipality" name="municipality" value={formData.municipality} onChange={handleChange} placeholder="Unesite opštinu" disabled={loading} required />
          </Field>
          <Field label="Adresa" htmlFor="address">
            <Input id="address" name="address" value={formData.address} onChange={handleChange} placeholder="Unesite adresu" disabled={loading} required />
          </Field>
          <Field label="Tip instalacije" htmlFor="type">
            <Input id="type" name="type" value={formData.type} onChange={handleChange} placeholder="Internet, IPTV, Telefon..." disabled={loading} required />
          </Field>

          {/* Technology and Team */}
          <div className="sx-form">
            <Field label="Tehnologija" htmlFor="technology">
              <Select id="technology" name="technology" value={formData.technology} onChange={handleChange} disabled={loading}>
                <option value="">-- Izaberite tehnologiju --</option>
                <option value="HFC">HFC</option>
                <option value="GPON">GPON</option>
                <option value="VDSL">VDSL</option>
                <option value="ADSL">ADSL</option>
              </Select>
            </Field>
            <Field label="Tim" htmlFor="tim">
              <Select id="tim" name="tim" value={formData.tim} onChange={handleChange} disabled={loading}>
                <option value="robotik">Robotik</option>
                <option value="mtel">mtel</option>
              </Select>
            </Field>
          </div>

          {/* Technicians */}
          <div className="sx-form">
            <Field label="Prvi tehničar" htmlFor="technicianId">
              <Select id="technicianId" name="technicianId" value={formData.technicianId} onChange={handleChange} disabled={loading}>
                <option value="">-- Izaberite prvog tehničara --</option>
                {technicians.map(tech => (
                  <option key={tech._id} value={tech._id}>{tech.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Drugi tehničar (opciono)" htmlFor="technician2Id">
              <Select id="technician2Id" name="technician2Id" value={formData.technician2Id} onChange={handleChange} disabled={loading}>
                <option value="">-- Izaberite drugog tehničara --</option>
                {technicians
                  .filter(tech => tech._id !== formData.technicianId)
                  .map(tech => (
                    <option key={tech._id} value={tech._id}>{tech.name}</option>
                  ))}
              </Select>
            </Field>
          </div>

          {/* TIS IDs */}
          <div className="sx-form">
            <Field label="TIS ID korisnika" htmlFor="tisId">
              <Input id="tisId" name="tisId" value={formData.tisId} onChange={handleChange} placeholder="ID korisnika u TIS sistemu" disabled={loading} />
            </Field>
            <Field label="TIS ID posla" htmlFor="tisJobId">
              <Input id="tisJobId" name="tisJobId" value={formData.tisJobId} onChange={handleChange} placeholder="ID posla u TIS sistemu" disabled={loading} />
            </Field>
          </div>

          {/* User Info */}
          <div className="sx-form">
            <Field label="Ime korisnika" htmlFor="userName">
              <Input id="userName" name="userName" value={formData.userName} onChange={handleChange} placeholder="Ime i prezime korisnika" disabled={loading} />
            </Field>
            <Field label="Telefon korisnika" htmlFor="userPhone">
              <Input id="userPhone" name="userPhone" value={formData.userPhone} onChange={handleChange} placeholder="Broj telefona korisnika" disabled={loading} />
            </Field>
          </div>

          <Field label="Dodatni poslovi" htmlFor="additionalJobs">
            <Input id="additionalJobs" name="additionalJobs" value={formData.additionalJobs} onChange={handleChange} placeholder="Format: ID,Opis/ID,Opis;..." disabled={loading} />
          </Field>
          <Field label="Detalji" htmlFor="details">
            <Textarea id="details" name="details" value={formData.details} onChange={handleChange} placeholder="Detalji za tehničara" disabled={loading} rows={3} />
          </Field>
          <Field label="Komentar" htmlFor="comment">
            <Textarea id="comment" name="comment" value={formData.comment} onChange={handleChange} placeholder="Dodatne napomene" disabled={loading} rows={3} />
          </Field>
        </Panel>
      </form>
    </div>
  );
};

export default AddWorkOrder;
