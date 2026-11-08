import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from '../../utils/toast';
import { techniciansAPI } from '../../services/api';
import { Btn } from '../../security/sx/ui';
import { PageHead, Panel, Note } from '../../security/sx/layout';
import { Field, Input } from '../../security/sx/forms';
import { LinkBtn } from '../../montaza/ui';
import './AddTechnician.mx.css';

// zvezdica obaveznog polja
const Req = () => <span style={{ color: 'var(--sx-bad-text)' }}>*</span>;

const AddTechnician = () => {
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value
    });

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Clear general error
    if (error) {
      setError('');
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Ime je obavezno polje';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Ime mora imati najmanje 2 karaktera';
    }

    if (!formData.password) {
      errors.password = 'Lozinka je obavezna';
    } else if (formData.password.length < 6) {
      errors.password = 'Lozinka mora imati najmanje 6 karaktera';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Potvrda lozinke je obavezna';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Lozinke se ne podudaraju';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = {
        name: formData.name.trim(),
        password: formData.password
      };

      await techniciansAPI.create(data);
      toast.success(`Tehničar "${formData.name}" je uspešno dodat!`);
      navigate('/technicians');
    } catch (error) {
      console.error('Greška pri dodavanju tehničara:', error);
      const errorMessage = error.response?.data?.error || 'Greška pri dodavanju tehničara. Pokušajte ponovo.';
      setError(errorMessage);
      toast.error('Neuspešno dodavanje tehničara!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sx-page" data-testid="page-technicians-add">
      <PageHead
        eyebrow="Montaža · Tehničari"
        title="Dodaj novog tehničara"
        actions={<LinkBtn to="/technicians" icon={ArrowLeft}>Povratak na listu</LinkBtn>}
      />

      <Panel
        footer={<>
          <LinkBtn
            to="/technicians"
            variant="ghost"
            onClick={(e) => {
              if (loading) {
                e.preventDefault();
              }
            }}
          >
            Odustani
          </LinkBtn>
          <Btn type="submit" form="add-technician-form" variant="primary" icon={Save} disabled={loading}>
            {loading ? 'Čuvanje...' : 'Sačuvaj tehničara'}
          </Btn>
        </>}
      >
        {error && <Note tone="bad" className="mx-mb">{error}</Note>}

        <form id="add-technician-form" onSubmit={handleSubmit} className="sx-form mx-addtech">
          <Field label={<>Ime tehničara <Req /></>} htmlFor="name" error={validationErrors.name} wide>
            <Input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Unesite ime tehničara"
              disabled={loading}
              autoFocus
              required
              invalid={!!validationErrors.name}
            />
          </Field>

          <Field label={<>Lozinka <Req /></>} htmlFor="password" error={validationErrors.password}>
            <Input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Unesite lozinku (min. 6 karaktera)"
              disabled={loading}
              required
              invalid={!!validationErrors.password}
            />
          </Field>

          <Field label={<>Potvrda lozinke <Req /></>} htmlFor="confirmPassword" error={validationErrors.confirmPassword}>
            <Input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Potvrdite lozinku"
              disabled={loading}
              required
              invalid={!!validationErrors.confirmPassword}
            />
          </Field>
        </form>
      </Panel>
    </div>
  );
};

export default AddTechnician;
