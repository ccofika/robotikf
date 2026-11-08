import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { toast } from '../../utils/toast';
import { AuthContext } from '../../context/AuthContext';
import { workOrdersAPI } from '../../services/api';
import { getTimRowStyle } from '../../utils/tim';
import { Btn, Led } from '../../security/sx/ui';
import { Note, KV } from '../../security/sx/layout';
import Dialog from '../../security/sx/Dialog';
import { Loading } from '../../montaza/ui';
import './OverdueWorkOrdersModal.mx.css';

const OverdueWorkOrdersModal = ({ onModalComplete }) => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [overdueOrders, setOverdueOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOverdueOrders();
  }, [user?._id]);

  const fetchOverdueOrders = async () => {
    if (!user?._id) return;
    
    setLoading(true);
    setError('');
    try {
      const response = await workOrdersAPI.getTechnicianOverdueWorkOrders(user._id);
      setOverdueOrders(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju overdue radnih naloga:', error);
      setError('Greška pri učitavanju radnih naloga!');
      toast.error('Greška pri učitavanju radnih naloga!');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkOrderClick = (workOrderId) => {
    navigate(`/my-work-orders/${workOrderId}`);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Nepoznato vreme';
    const date = new Date(dateString);
    return date.toLocaleDateString('sr-RS') + ' ' + date.toLocaleTimeString('sr-RS', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getOverdueHours = (appointmentDateTime) => {
    if (!appointmentDateTime) return 0;
    const now = new Date();
    const appointment = new Date(appointmentDateTime);
    const diffMs = now.getTime() - appointment.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    return Math.max(0, diffHours);
  };

  if (!loading && !error && overdueOrders.length === 0) {
    return null; // No overdue orders
  }

  // Dijalog bez zatvaranja (nema X, Escape ni klika van): stoji umesto stranice dok se zakasneli nalozi ne završe;
  // klik na nalog otvara njegov detalj (jedina dozvoljena putanja)
  return (
    <Dialog
      size="lg"
      eyebrow="Montaža · Radni nalozi"
      title={error ? 'Greška' : 'Potrebno je završiti stare radne naloge'}
      description={error || 'Da biste nastavili sa daljim radom, potrebno je da završite sledeće radne naloge koji su trebali biti završeni pre više od 24 sata:'}
      testId="overdue-work-orders"
      footer={error ? (
        <Btn variant="primary" onClick={() => window.location.reload()}>Osvežiti stranicu</Btn>
      ) : loading ? null : (
        <div className="mx-overdue__foot">
          <Led tone="info" />
          <div>
            <b>Kada završite sve overdue radne naloge, moći ćete normalno da koristite aplikaciju</b>
            <span>Neće biti moguće pristupiti drugim stranicama dok se svi radni nalozi ne završe</span>
          </div>
        </div>
      )}
    >
      {loading ? (
        <Loading rows={3} h={72} text="Učitavanje radnih naloga..." />
      ) : error ? null : (
        <div className="mx-overdue">
          <Note tone="bad">
            {overdueOrders.length} {overdueOrders.length === 1 ? 'radni nalog' : overdueOrders.length < 5 ? 'radnih naloga' : 'radnih naloga'} koji čeka{overdueOrders.length === 1 ? '' : 'ju'} na završetak
          </Note>

          <div className="mx-overdue__list">
            {overdueOrders.map((workOrder) => (
              <div
                key={workOrder._id}
                role="button"
                tabIndex={0}
                className="sx-subject mx-overdue__item"
                data-tone="bad"
                style={getTimRowStyle(workOrder.tim)}
                onClick={() => handleWorkOrderClick(workOrder._id)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleWorkOrderClick(workOrder._id); }}
              >
                <b className="mx-overdue__addr">{workOrder.address}</b>
                <KV items={[
                  { k: 'Zakazan za', v: formatDateTime(workOrder.appointmentDateTime) },
                  { k: 'Kasni', v: `${getOverdueHours(workOrder.appointmentDateTime)} ${getOverdueHours(workOrder.appointmentDateTime) === 1 ? 'sat' : getOverdueHours(workOrder.appointmentDateTime) < 5 ? 'sata' : 'sati'}`, tone: 'bad' },
                  workOrder.type && { k: 'Tip', v: workOrder.type }
                ]} />

                {workOrder.comment && <p className="mx-overdue__comment">{workOrder.comment}</p>}

                {/* razlog vraćanja (admin vratio nalog) */}
                {workOrder.adminComment && <Note tone="bad"><b>Razlog vraćanja:</b> {workOrder.adminComment}</Note>}

                <span className="mx-overdue__open">Kliknite da otvorite radni nalog <ArrowRight size={15} strokeWidth={1.9} aria-hidden="true" /></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Dialog>
  );
};

export default OverdueWorkOrdersModal;
