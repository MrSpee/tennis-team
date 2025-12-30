import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Upload, X, CheckCircle, Image as ImageIcon } from 'lucide-react';
import '../SuperAdminDashboard.css';

/**
 * Komponente zum Hochladen von Vereins-Logos
 * @param {Object} club - Verein-Objekt mit id, name
 * @param {string} club.logo_url - Aktuelle Logo-URL (optional)
 * @param {Function} onUploadComplete - Callback nach erfolgreichem Upload
 */
export default function TeamLogoUpload({ club, onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(club?.logo_url || null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset
    e.target.value = null;
    setError('');
    setSuccess(false);

    // Validiere Dateityp
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const isValidType = validTypes.includes(file.type.toLowerCase()) || file.type.startsWith('image/');
    
    if (!isValidType) {
      setError(`Dateityp nicht unterstützt: ${file.type}. Erlaubt: JPEG, PNG, GIF, WebP`);
      return;
    }

    // Validiere Dateigröße (max 5MB für Logos)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError(`Das Bild ist zu groß (${Math.round(file.size / 1024 / 1024)}MB). Maximal 5MB erlaubt.`);
      return;
    }

    // Preview erstellen
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload starten
    setUploading(true);

    try {
      // Generiere sicheren Dateinamen
      let fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      if (!fileExt || fileExt === '') {
        if (file.type.includes('jpeg') || file.type.includes('jpg')) {
          fileExt = 'jpg';
        } else if (file.type.includes('png')) {
          fileExt = 'png';
        } else {
          fileExt = 'jpg';
        }
      }

      // Dateiname: club_{clubId}_{timestamp}.{ext}
      const safeFileName = `club_${club.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `club-logos/${safeFileName}`;

      console.log(`🔄 Uploading club logo:`, { 
        clubId: club.id,
        fileName: file.name,
        safeFileName, 
        filePath, 
        fileSize: file.size,
        fileType: file.type
      });

      // Upload zu profile-images Bucket (wiederverwenden, da bereits konfiguriert)
      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Public URL generieren
      const { data } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;
      console.log('✅ Upload successful, URL:', publicUrl);

      // Aktualisiere club_info Tabelle
      const { error: updateError } = await supabase
        .from('club_info')
        .update({ logo_url: publicUrl })
        .eq('id', club.id);

      if (updateError) {
        throw new Error(`Fehler beim Speichern in Datenbank: ${updateError.message}`);
      }

      console.log('✅ Logo URL in Datenbank gespeichert');
      setPreview(publicUrl);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      // Callback aufrufen
      if (onUploadComplete) {
        onUploadComplete(publicUrl);
      }

    } catch (error) {
      console.error('❌ Upload error:', error);
      if (error.message.includes('Bucket not found')) {
        setError('Storage-Bucket nicht gefunden. Bitte prüfen Sie die Bucket-Konfiguration.');
      } else if (error.message.includes('row-level security policy')) {
        setError('RLS-Policy blockiert Upload. Bitte prüfen Sie die Berechtigungen.');
      } else if (error.message.includes('file size') || error.message.includes('too large')) {
        setError('Datei zu groß. Bitte wählen Sie ein kleineres Bild.');
      } else {
        setError(`Upload-Fehler: ${error.message}`);
      }
      setPreview(club?.logo_url || null); // Preview zurücksetzen
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!confirm('Möchten Sie das Logo wirklich entfernen?')) {
      return;
    }

    setUploading(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('club_info')
        .update({ logo_url: null })
        .eq('id', club.id);

      if (updateError) {
        throw updateError;
      }

      setPreview(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      if (onUploadComplete) {
        onUploadComplete(null);
      }

    } catch (error) {
      console.error('❌ Fehler beim Entfernen:', error);
      setError(`Fehler beim Entfernen: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="team-logo-upload-container">
      <div className="team-logo-preview-section">
        {preview ? (
          <div className="team-logo-preview">
            <img 
              src={preview} 
              alt={`${club?.name || 'Verein'} Logo`}
              className="team-logo-preview-image"
              onError={(e) => {
                console.error('Image load error:', e);
                setError('Fehler beim Laden des Logos');
                setPreview(null);
              }}
            />
            {!uploading && (
              <button
                className="btn-remove-logo"
                onClick={handleRemoveLogo}
                title="Logo entfernen"
              >
                <X size={16} />
              </button>
            )}
          </div>
        ) : (
          <div className="team-logo-placeholder">
            <ImageIcon size={48} />
            <span>Kein Logo</span>
          </div>
        )}
      </div>

      <div className="team-logo-upload-controls">
        <label className="btn btn-primary" style={{ cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
          <Upload size={16} />
          {uploading ? 'Wird hochgeladen...' : preview ? 'Logo ändern' : 'Logo hochladen'}
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {error && (
        <div className="team-logo-error" style={{
          marginTop: '0.75rem',
          padding: '0.75rem',
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          borderRadius: '0.5rem',
          fontSize: '0.875rem'
        }}>
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="team-logo-success" style={{
          marginTop: '0.75rem',
          padding: '0.75rem',
          backgroundColor: '#d1fae5',
          color: '#065f46',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle size={16} />
          Logo erfolgreich {preview ? 'aktualisiert' : 'entfernt'}!
        </div>
      )}
    </div>
  );
}

