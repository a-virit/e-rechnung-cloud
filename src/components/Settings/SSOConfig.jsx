//src/components/Settings/SSOConfig.jsx
import React, { useEffect, useState } from 'react';
import { Shield, Save } from 'lucide-react';
import { configService } from '../../services/configService';

const SSOConfig = () => {
    const [sso, setSso] = useState({ provider: '', issuer: '', clientId: '', clientSecret: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const canEditSensitive = configService.canEditSensitiveSettings();

    useEffect(() => {
        const load = async () => {
            try {
                await configService.update(payload).catch(err => { throw err; });
                setMessage('Konfiguration gespeichert');
            } catch (err) {
                console.error("SSO Update failed:", err);
                setMessage(err.message || 'Speichern fehlgeschlagen');
            }
        };
        load();
    }, []);

    const save = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const payload = { sso: { ...sso } };
            if (!canEditSensitive) {
                delete payload.sso.clientSecret;
            }
            await configService.update(payload);
            setMessage('Konfiguration gespeichert');
        } catch (err) {
            setMessage(err.message || 'Speichern fehlgeschlagen');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-6 bg-white border border-gray-200 rounded-lg">Lade...</div>;
    }

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Single Sign-On
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-2">Provider</label>
                    <input
                        type="text"
                        value={sso.provider}
                        onChange={e => setSso({ ...sso, provider: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-2">Issuer</label>
                    <input
                        type="text"
                        value={sso.issuer}
                        onChange={e => setSso({ ...sso, issuer: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-2">Client ID</label>
                    <input
                        type="text"
                        value={sso.clientId}
                        onChange={e => setSso({ ...sso, clientId: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                {canEditSensitive && (
                    <div>
                        <label className="block text-sm font-medium mb-2">Client Secret</label>
                        <input
                            type="password"
                            value={sso.clientSecret || ''}
                            onChange={e => setSso({ ...sso, clientSecret: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                )}
            </div>

            {message && (
                <div className="text-sm text-gray-700">{message}</div>
            )}

            <button
                onClick={save}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Speichere...' : 'Speichern'}
            </button>
        </div>
    );
};

export default SSOConfig;