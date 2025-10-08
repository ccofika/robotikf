import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BackIcon, SaveIcon, DeleteIcon, BoxIcon } from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import { materialsAPI } from '../../services/api';
import { toast } from '../../utils/toast';

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
    if (window.confirm(`Da li ste sigurni da želite da obrišete materijal "${formData.type}"?`)) {
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
  
  if (loading && formData.type === '') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex items-center space-x-3 text-slate-600">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
            <span className="text-sm font-medium">Učitavanje materijala...</span>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Modern Header */}
      <div className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <BoxIcon size={24} className="text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Izmeni materijal</h1>
              <p className="text-slate-600 mt-1">Uređivanje postojeg materijala</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link to="/materials">
              <Button 
                type="secondary"
                size="medium"
                prefix={<BackIcon size={16} />}
              >
                Povratak na listu
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Form Card */}
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden max-w-2xl mx-auto">
        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="type" className="block text-sm font-medium text-slate-700">
                Vrsta materijala:
              </label>
              <input
                type="text"
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                placeholder="Unesite vrstu materijala"
                disabled={loading}
                autoFocus
                required
                className="h-11 w-full px-4 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="quantity" className="block text-sm font-medium text-slate-700">
                Količina:
              </label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                min="0"
                disabled={loading}
                required
                className="h-11 w-full px-4 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            
            <div className="flex items-center justify-between pt-6 border-t border-slate-200">
              <Button 
                type="error"
                size="medium"
                onClick={handleDelete}
                disabled={loading}
                prefix={<DeleteIcon size={16} />}
              >
                Obriši
              </Button>
              
              <div className="flex items-center space-x-3">
                <Link to="/materials">
                  <Button 
                    type="secondary"
                    size="medium"
                  >
                    Odustani
                  </Button>
                </Link>
                <Button 
                  type="primary"
                  size="medium"
                  onClick={handleSubmit}
                  loading={loading}
                  prefix={<SaveIcon size={16} />}
                >
                  {loading ? 'Čuvanje...' : 'Sačuvaj izmene'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditMaterial;