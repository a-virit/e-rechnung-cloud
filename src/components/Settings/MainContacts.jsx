import React, { useEffect, useState } from 'react';
import authService from '../../services/authService.js';
import { useApp } from '../../context/AppContext';

const MainContacts = () => {
  const { actions } = useApp();
  const [contacts, setContacts] = useState([
    { name: '', email: '', phone: '' },
    { name: '', email: '', phone: '' }
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContacts = async () => {
      try {
        const token = authService.getToken();
        const res = await fetch('/api/company/contacts', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });

        if (res.ok) {
          const result = await res.json();
          if (result.success && Array.isArray(result.data) && result.data.length === 2) {
            setContacts(result.data);
          }
        } else {
          actions.showError('Fehler beim Laden der Kontakte');
        }
      } catch (error) {
        actions.showError('Fehler beim Laden der Kontakte');
      } finally {
        setLoading(false);
      }
    };

    loadContacts();
  }, [actions]);

  const handleChange = (index, field, value) => {
    setContacts(prev => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    for (const contact of contacts) {
      if (!contact.name || !contact.email || !contact.phone) {
        actions.showError('Alle Felder sind erforderlich');
        return;
      }
    }

    try {
      const token = authService.getToken();
      const res = await fetch('/api/company/contacts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ mainContacts: contacts })
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Speichern fehlgeschlagen');
      }

      actions.showSuccess('Kontakte gespeichert');
    } catch (error) {
      actions.showError(error.message);
    }
  };

  if (loading) {
    return <div>Lade...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {contacts.map((contact, idx) => (
        <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            className="border p-2 rounded"
            placeholder="Name"
            value={contact.name}
            onChange={(e) => handleChange(idx, 'name', e.target.value)}
            required
          />
          <input
            type="email"
            className="border p-2 rounded"
            placeholder="E-Mail"
            value={contact.email}
            onChange={(e) => handleChange(idx, 'email', e.target.value)}
            required
          />
          <input
            type="tel"
            className="border p-2 rounded"
            placeholder="Telefon"
            value={contact.phone}
            onChange={(e) => handleChange(idx, 'phone', e.target.value)}
            required
          />
        </div>
      ))}
      <button
        type="submit"
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Speichern
      </button>
    </form>
  );
};

export default MainContacts;