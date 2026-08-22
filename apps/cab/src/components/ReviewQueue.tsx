import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { useTranslation, type Locale } from '../lib/i18n';

export function ReviewQueue({ reviews, locale = 'id' }: { reviews: any[]; locale?: Locale }) {
  const copy = useTranslation(locale).shell;
  const [filter, setFilter] = useState('PENDING');

  const filteredReviews = reviews.filter(r => (filter === 'ALL' ? true : (r.status ?? 'PENDING') === filter));

  return (
    <div className="mw-ai-playground">
      <div className="mw-playground-hero">
        <div>
          <div className="mw-eyebrow">{copy.reviewQueue}</div>
          <h2>Review Queue</h2>
          <p>Assign, acknowledge, request evidence, escalate, dispose, and reopen governed human reviews.</p>
        </div>
      </div>
      
      <div className="mw-filter-bar" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <Button variant={filter === 'PENDING' ? 'default' : 'ghost'} onClick={() => setFilter('PENDING')}>Pending</Button>
        <Button variant={filter === 'IN_PROGRESS' ? 'default' : 'ghost'} onClick={() => setFilter('IN_PROGRESS')}>In Progress</Button>
        <Button variant={filter === 'DISPOSED' ? 'default' : 'ghost'} onClick={() => setFilter('DISPOSED')}>Disposed</Button>
        <Button variant={filter === 'ALL' ? 'default' : 'ghost'} onClick={() => setFilter('ALL')}>All</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reviews ({filteredReviews.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReviews.length === 0 ? (
            <div className="mw-empty">No reviews found for this filter.</div>
          ) : (
            <table className="mw-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--mw-border)' }}>
                  <th style={{ padding: '8px' }}>ID</th>
                  <th style={{ padding: '8px' }}>Type</th>
                  <th style={{ padding: '8px' }}>Target</th>
                  <th style={{ padding: '8px' }}>Status</th>
                  <th style={{ padding: '8px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReviews.map((review, i) => (
                  <tr key={review.id || i} style={{ borderBottom: '1px solid var(--mw-border)' }}>
                    <td style={{ padding: '8px' }}>{review.id || `REV-${i}`}</td>
                    <td style={{ padding: '8px' }}>{review.type || 'GATE_REVIEW'}</td>
                    <td style={{ padding: '8px' }}>{review.targetId || 'UNKNOWN'}</td>
                    <td style={{ padding: '8px' }}>
                      <Badge tone={review.status === 'DISPOSED' ? 'positive' : 'warning'}>
                        {review.status || 'PENDING'}
                      </Badge>
                    </td>
                    <td style={{ padding: '8px' }}>
                      <Button variant="ghost">Open</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
