import { useState, useRef } from 'react';
import { MapPin, Star, CheckCircle, ExternalLink, RotateCcw, AlertCircle, Loader2 } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const GOOGLE_REVIEW_URL = 'https://search.google.com/local/writereview?placeid=ChIJP5xQ0l9HCTkR3iqH05m7-y4';

// ─── Options (4 per question) ─────────────────────────────────────────────────

const STAFF_OPTIONS = [
  'Very Professional & Friendly',
  'Attentive and Helpful',
  'Good and Satisfactory',
  'Could Have Been Better',
];

const LIKED_OPTIONS = [
  'Quality of the Service',
  "The Stylist's Skills",
  'Cleanliness & Ambience',
  'Overall Value for Money',
];

// ─── Star Rating Component ────────────────────────────────────────────────────

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="star-row" role="radiogroup" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            id={`star-${star}`}
            className={`star-btn${filled ? ' filled' : ''}`}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            aria-pressed={value === star}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
          >
            <Star size={36} className="star-icon" />
          </button>
        );
      })}
    </div>
  );
}

// ─── Option Button ────────────────────────────────────────────────────────────

function OptionBtn({
  id, label, selected, onSelect,
}: { id: string; label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      id={id}
      type="button"
      className={`opt-btn${selected ? ' selected' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="opt-radio">
        <span className="opt-dot" />
      </span>
      {label}
    </button>
  );
}

// ─── Thank You Modal (for < 4 stars) ─────────────────────────────────────────

function ThankYouModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Review submitted">
      <div className="modal-box gs-animate-in">
        <div className="modal-icon">
          <CheckCircle size={44} color="#6EC47A" />
        </div>
        <h2 className="modal-title">Review Submitted!</h2>
        <p className="modal-sub">
          Thank you for sharing your feedback with us.<br />
          We truly appreciate you taking the time — your experience helps us improve.
        </p>
        <button
          id="btn-modal-done"
          className="gs-btn-primary"
          onClick={onClose}
          type="button"
        >
          Done
        </button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

type Phase = 'form' | 'loading' | 'done-low' | 'done-high';

export default function App() {
  // Form state
  const [service, setService] = useState('');
  const [stars, setStars] = useState(0);
  const [staff, setStaff] = useState('');
  const [liked, setLiked] = useState('');
  const [comments, setComments] = useState('');

  // Phase
  const [phase, setPhase] = useState<Phase>('form');

  // Errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');

  // Generated review
  const [review, setReview] = useState('');

  // Refs for scroll
  const formRef = useRef<HTMLDivElement>(null);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!service.trim()) errs.service = 'Please tell us which service you experienced.';
    if (!stars) errs.stars = 'Please select a star rating.';
    if (!staff) errs.staff = 'Please select one option.';
    if (!liked) errs.liked = 'Please select one option.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setApiError('');
    setPhase('loading');

    try {
      const res = await fetch('/api/generate-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: service.trim(),
          stars,
          staffFeedback: staff,
          likedMost: liked,
          additionalComments: comments,
        }),
      });

      const data = await res.json() as { review?: string; error?: string; setupRequired?: boolean };

      if (!res.ok || data.error) {
        setApiError(data.error || 'Something went wrong. Please try again.');
        setPhase('form');
        return;
      }

      const generatedReview = data.review || '';
      setReview(generatedReview);

      if (stars >= 4) {
        // Copy to clipboard and open Google
        try {
          await navigator.clipboard.writeText(generatedReview);
        } catch {
          // clipboard unavailable — user will paste manually
        }
        window.open(GOOGLE_REVIEW_URL, '_blank', 'noopener,noreferrer');
        setPhase('done-high');
      } else {
        // Show internal thank-you popup
        setPhase('done-low');
      }
    } catch {
      setApiError('Network error. Please check your connection and try again.');
      setPhase('form');
    }
  };

  const handleReset = () => {
    setService('');
    setStars(0);
    setStaff('');
    setLiked('');
    setComments('');
    setPhase('form');
    setFieldErrors({});
    setApiError('');
    setReview('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const starLabel = ['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'][stars] || '';

  return (
    <div className="gs-page">
      {/* ── Header ── */}
      <header className="gs-header">
        <svg className="gs-scissors-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <line x1="20" y1="4" x2="8.12" y2="15.88" />
          <line x1="14.47" y1="14.48" x2="20" y2="20" />
          <line x1="8.12" y1="8.12" x2="12" y2="12" />
        </svg>
        <h1 className="gs-wordmark">Golden Scissor</h1>
        <p className="gs-wordmark-sub">Unisex Salon</p>
        <div className="header-loc">
          <MapPin size={11} className="loc-icon" />
          Haridwar, Uttarakhand
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="gs-content" ref={formRef} id="main-content">

        {/* ─ Loading ─ */}
        {phase === 'loading' && (
          <div className="gs-loading gs-animate-in">
            <div className="spinner-ring">
              <Loader2 size={32} className="spinner-icon" />
            </div>
            <p className="loading-text">Crafting your review…</p>
            <p className="loading-sub">Just a moment</p>
          </div>
        )}

        {/* ─ Post-submit (4-5 stars) ─ */}
        {phase === 'done-high' && (
          <div className="gs-animate-in done-screen">
            <div className="done-icon">
              <CheckCircle size={48} color="#6EC47A" />
            </div>
            <h2 className="done-title">Review Copied & Google Opened!</h2>
            <p className="done-sub">
              Your review has been copied to your clipboard.<br />
              Google Reviews is open in a new tab — <strong>just paste your review and tap Submit.</strong>
            </p>

            <div className="review-preview-card">
              <span className="review-card-label">Your Review</span>
              <p className="review-card-text">{review}</p>
            </div>

            <div className="done-stars">
              {[1,2,3,4,5].map(s => (
                <Star key={s} size={20} className={s <= stars ? 'star-filled-small' : 'star-empty-small'} />
              ))}
            </div>

            <a
              id="btn-open-google-again"
              href={GOOGLE_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="gs-btn-primary"
              style={{ textDecoration: 'none', marginTop: '1rem' }}
            >
              Open Google Reviews Again
              <ExternalLink size={15} />
            </a>

            <button
              id="btn-start-again-high"
              className="gs-btn-ghost"
              onClick={handleReset}
              type="button"
              style={{ marginTop: '0.75rem', width: '100%', textAlign: 'center' }}
            >
              <RotateCcw size={13} style={{ marginRight: 6 }} />
              Start Again
            </button>

            <p className="disclaimer">
              Your review is only posted when you submit it on Google yourself.
            </p>
          </div>
        )}

        {/* ─ Form ─ */}
        {(phase === 'form') && (
          <div className="gs-animate-in form-page">
            <div className="form-intro">
              <h2 className="form-heading">How Was Your Experience?</h2>
              <p className="form-sub">Share your visit in a few quick steps. We'll help you write the review.</p>
            </div>

            {apiError && (
              <div className="error-bar">
                <AlertCircle size={15} />
                {apiError}
              </div>
            )}

            {/* ── Q1: Service ── */}
            <div className="field-block">
              <label className="field-label" htmlFor="service-input">
                Which service did you experience?
              </label>
              <input
                id="service-input"
                className={`gs-input${fieldErrors.service ? ' input-error' : ''}`}
                type="text"
                placeholder="e.g. Haircut, Facial, Beard Styling…"
                value={service}
                onChange={(e) => {
                  setService(e.target.value);
                  if (fieldErrors.service) setFieldErrors(p => ({ ...p, service: '' }));
                }}
                maxLength={120}
                autoComplete="off"
              />
              {fieldErrors.service && <p className="field-error">{fieldErrors.service}</p>}
            </div>

            {/* ── Q2: Star Rating ── */}
            <div className="field-block">
              <label className="field-label">Rate your overall experience</label>
              <StarRating value={stars} onChange={(v) => {
                setStars(v);
                if (fieldErrors.stars) setFieldErrors(p => ({ ...p, stars: '' }));
              }} />
              {stars > 0 && (
                <p className="star-label-text">
                  {starLabel}
                </p>
              )}
              {fieldErrors.stars && <p className="field-error">{fieldErrors.stars}</p>}
            </div>

            {/* ── Q3: Staff ── */}
            <div className="field-block">
              <label className="field-label">How was your experience with our staff?</label>
              <div className="opts-grid" role="radiogroup">
                {STAFF_OPTIONS.map((opt, i) => (
                  <OptionBtn
                    key={opt}
                    id={`staff-opt-${i}`}
                    label={opt}
                    selected={staff === opt}
                    onSelect={() => {
                      setStaff(opt);
                      if (fieldErrors.staff) setFieldErrors(p => ({ ...p, staff: '' }));
                    }}
                  />
                ))}
              </div>
              {fieldErrors.staff && <p className="field-error">{fieldErrors.staff}</p>}
            </div>

            {/* ── Q4: Liked Most ── */}
            <div className="field-block">
              <label className="field-label">What did you like most about your visit?</label>
              <div className="opts-grid" role="radiogroup">
                {LIKED_OPTIONS.map((opt, i) => (
                  <OptionBtn
                    key={opt}
                    id={`liked-opt-${i}`}
                    label={opt}
                    selected={liked === opt}
                    onSelect={() => {
                      setLiked(opt);
                      if (fieldErrors.liked) setFieldErrors(p => ({ ...p, liked: '' }));
                    }}
                  />
                ))}
              </div>
              {fieldErrors.liked && <p className="field-error">{fieldErrors.liked}</p>}
            </div>

            {/* ── Optional comments ── */}
            <div className="field-block">
              <label className="field-label optional-lbl" htmlFor="comments-input">
                Anything else to mention?
                <span className="optional-tag">Optional</span>
              </label>
              <textarea
                id="comments-input"
                className="gs-textarea"
                placeholder="Share any additional details…"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                maxLength={400}
                rows={3}
              />
            </div>

            {/* ── Submit ── */}
            <button
              id="btn-generate-review"
              className="gs-btn-primary submit-btn"
              type="button"
              onClick={handleSubmit}
            >
              {stars > 0 && stars < 4 ? 'Submit My Feedback' : 'Generate & Share Review'}
            </button>

            <p className="privacy-note">
              We don't collect your name, phone, or email. Your feedback is private.
            </p>
          </div>
        )}
      </main>

      {/* ── Thank You Modal (< 4 stars) ── */}
      {phase === 'done-low' && (
        <ThankYouModal onClose={handleReset} />
      )}
    </div>
  );
}
