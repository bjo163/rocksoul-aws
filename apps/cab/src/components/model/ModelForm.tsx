import { useState, type FormEvent } from 'react';
import type { Model } from '../../types';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useTranslation } from '../../lib/i18n';
import { useCivicPreferences } from '@moonwitness/ui';

export function ModelForm({ model, initialData, onSubmit, onCancel }: { model: Model; initialData?: any; onSubmit: (data: any) => Promise<void>; onCancel: () => void }) {
  const { locale } = useCivicPreferences('id');
  const copy = useTranslation(locale).model;
  const [data, setData] = useState<any>(initialData || {});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSubmit(data);
    } finally {
      setBusy(false);
    }
  };

  const updateField = (path: string, value: string) => {
    setData((prev: any) => {
      const next = { ...prev };
      const parts = path.split('.');
      let current = next;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const getFieldValue = (path: string) => {
    return path.split('.').reduce((a, k) => a?.[k], data) ?? '';
  };

  return (
    <form onSubmit={handleSubmit} className="mw-form">
      {model.ui.fields.map(f => (
        <label key={f.name} className="mw-field">
          <span>{f.label}</span>
          <Input 
            value={String(getFieldValue(f.path))} 
            onChange={(e) => updateField(f.path, e.target.value)} 
          />
        </label>
      ))}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>{copy.cancel}</Button>
        <Button type="submit" disabled={busy}>{busy ? copy.saving : copy.save}</Button>
      </div>
    </form>
  );
}
