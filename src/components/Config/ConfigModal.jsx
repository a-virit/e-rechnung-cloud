// E-Mail Sektion - Überarbeitet für externe Mailprovider
const EmailSection = ({ data, templates, onChange, onTemplateChange }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold flex items-center">
      <Mail className="w-5 h-5 mr-2" />
      E-Mail-Versand
    </h3>
    
    {/* Info-Banner */}
    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
      <p className="text-sm text-blue-700">
        📧 <strong>Einfache E-Mail-Konfiguration:</strong> Geben Sie nur Ihre gewünschte Absender-E-Mail ein. 
        Unser System übernimmt den technischen E-Mail-Versand über professionelle Mailserver.
      </p>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Mailprovider-Auswahl */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail-Service</label>
        <select
          value={data.provider || 'sendgrid'}
          onChange={(e) => onChange({ provider: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="sendgrid">SendGrid (Empfohlen)</option>
          <option value="mailgun">Mailgun</option>
          <option value="postmark">Postmark</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">Professioneller E-Mail-Service</p>
      </div>
      
      {/* Absender-E-Mail */}
      <ConfigField
        label="Ihre Absender-E-Mail"
        type="email"
        value={data.senderEmail || ''}
        onChange={(value) => onChange({ senderEmail: value })}
        placeholder="rechnung@ihrefirma.de"
        required
      />
      
      {/* Absender-Name */}
      <ConfigField
        label="Absender-Name"
        value={data.senderName || ''}
        onChange={(value) => onChange({ senderName: value })}
        placeholder="Ihre Firma GmbH"
      />
      
      {/* Reply-To E-Mail */}
      <ConfigField
        label="Antwort-E-Mail (optional)"
        type="email"
        value={data.replyToEmail || ''}
        onChange={(value) => onChange({ replyToEmail: value })}
        placeholder="support@ihrefirma.de"
      />
    </div>

    {/* Provider-spezifische Hinweise */}
    <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
      <h5 className="text-sm font-medium text-gray-700 mb-2">
        {data.provider === 'sendgrid' && '📧 SendGrid - Zuverlässig & Schnell'}
        {data.provider === 'mailgun' && '🚀 Mailgun - Entwicklerfreundlich'}  
        {data.provider === 'postmark' && '✉️ Postmark - Premium-Zustellung'}
      </h5>
      <p className="text-xs text-gray-600">
        {data.provider === 'sendgrid' && 'Über 100 Milliarden E-Mails pro Monat. Hohe Zustellrate und Spam-Schutz.'}
        {data.provider === 'mailgun' && 'API-first Ansatz mit detaillierten Analytics und Tracking.'}
        {data.provider === 'postmark' && 'Spezialisiert auf Transactional Emails mit 99%+ Zustellrate.'}
      </p>
    </div>

    {/* E-Mail Template */}
    <div className="border-t pt-4 mt-6">
      <h4 className="font-medium mb-3">E-Mail-Template</h4>
      
      <ConfigField
        label="E-Mail-Betreff"
        value={templates.invoice?.subject || ''}
        onChange={(value) => onTemplateChange({
          ...templates,
          invoice: { ...templates.invoice, subject: value }
        })}
        placeholder="Neue Rechnung: {{invoiceNumber}}"
        fullWidth
      />
      
      <ConfigField
        label="E-Mail-Text"
        type="textarea"
        value={templates.invoice?.body || ''}
        onChange={(value) => onTemplateChange({
          ...templates,
          invoice: { ...templates.invoice, body: value }
        })}
        placeholder="Verfügbare Variablen: {{invoiceNumber}}, {{amount}}, {{currency}}, {{customerName}}, {{companyName}}, {{dueDate}}"
        rows={8}
        fullWidth
      />
      
      {/* Template-Variablen - KORRIGIERT */}
      <div className="bg-gray-50 rounded p-3 mt-2">
        <p className="text-xs text-gray-600 font-medium mb-1">Verfügbare Variablen:</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-500">
          <code>{'{{invoiceNumber}}'}</code>
          <code>{'{{amount}}'}</code>
          <code>{'{{currency}}'}</code>
          <code>{'{{customerName}}'}</code>
          <code>{'{{companyName}}'}</code>
          <code>{'{{dueDate}}'}</code>
        </div>
      </div>
    </div>

    {/* Test-E-Mail Funktion */}
    <div className="border-t pt-4 mt-6">
      <button
        type="button"
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
        onClick={() => {
          // Test-E-Mail-Funktion implementieren
          alert('Test-E-Mail-Versand wird implementiert...');
        }}
      >
        📧 Test-E-Mail senden
      </button>
      <p className="text-xs text-gray-500 mt-1">
        Sendet eine Test-E-Mail an Ihre Absender-Adresse
      </p>
    </div>
  </div>
);

// ============================================
// Zusätzliche .env.local Konfiguration:
// ============================================

/* 
Fügen Sie diese Umgebungsvariablen hinzu:

# E-Mail Service API Keys (System-Level)
SENDGRID_API_KEY=your_sendgrid_api_key_here
MAILGUN_API_KEY=your_mailgun_api_key_here  
MAILGUN_DOMAIN=your_mailgun_domain_here
POSTMARK_SERVER_TOKEN=your_postmark_token_here

# Vercel URL für Entwicklung/Produktion
VERCEL_URL=https://ihr-app-name.vercel.app
*/