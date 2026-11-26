import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Compass,
  Eye,
  HelpCircle,
  Layers,
  Telescope,
  Wrench,
} from 'lucide-react';
import {
  OBSERVING_SETUPS,
  ObservingSetup,
  SetupId,
  getSetupById,
} from '../data/observingSetups';
import {
  azimuthToCompass,
  formatPassDate,
  formatPassTime,
} from '../services/passPredictor';
import type { SatellitePass } from '../types/orbit';

interface ObservingGuideProps {
  selectedPass: SatellitePass | null;
  timezone: string;
  locationName: string;
}

const SetupDiagram: React.FC<{ setupId: SetupId }> = ({ setupId }) => {
  switch (setupId) {
    case 'naked-eye':
      return (
        <svg viewBox="0 0 260 130" className="guide-diagram" role="img" aria-label="Naked-eye sky viewing diagram">
          <rect x="0" y="0" width="260" height="130" rx="8" fill="#f8fafc" />
          <path d="M 25 105 Q 130 15 235 105" fill="none" stroke="#0d9488" strokeWidth="2.5" strokeDasharray="5 4" />
          <circle cx="130" cy="40" r="5" fill="#0d9488" />
          <text x="139" y="37" fontSize="10" fontWeight="700" fill="#0f172a">ISS (steady glow)</text>
          <circle cx="65" cy="98" r="7" fill="#475569" />
          <line x1="65" y1="105" x2="65" y2="122" stroke="#475569" strokeWidth="3" />
          <line x1="65" y1="98" x2="123" y2="44" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
          <text x="20" y="122" fontSize="9.5" fill="#475569">Wide natural sky view — no gear needed</text>
        </svg>
      );
    case 'binoculars':
      return (
        <svg viewBox="0 0 260 130" className="guide-diagram" role="img" aria-label="Binoculars parts diagram">
          <rect x="0" y="0" width="260" height="130" rx="8" fill="#f8fafc" />
          <rect x="55" y="45" width="70" height="22" rx="4" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
          <rect x="55" y="73" width="70" height="22" rx="4" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
          <rect x="125" y="50" width="25" height="14" rx="2" fill="#94a3b8" />
          <rect x="125" y="76" width="25" height="14" rx="2" fill="#94a3b8" />
          <circle cx="100" cy="70" r="6" fill="#0d9488" />
          <text x="45" y="34" fontSize="9.5" fontWeight="600" fill="#0f172a">Objective lenses</text>
          <text x="158" y="60" fontSize="9.5" fontWeight="600" fill="#0f172a">Eyepieces</text>
          <text x="158" y="88" fontSize="9.5" fill="#475569">+ diopter ring</text>
          <text x="80" y="116" fontSize="9.5" fill="#0d9488" fontWeight="600">Center focus wheel</text>
        </svg>
      );
    case 'refractor':
      return (
        <svg viewBox="0 0 260 130" className="guide-diagram" role="img" aria-label="Refractor telescope parts diagram">
          <rect x="0" y="0" width="260" height="130" rx="8" fill="#f8fafc" />
          {/* Tripod */}
          <line x1="130" y1="68" x2="95" y2="118" stroke="#64748b" strokeWidth="2.5" />
          <line x1="130" y1="68" x2="165" y2="118" stroke="#64748b" strokeWidth="2.5" />
          <line x1="130" y1="68" x2="130" y2="120" stroke="#94a3b8" strokeWidth="2" />
          {/* Tube */}
          <g transform="rotate(-18 130 58)">
            <rect x="60" y="48" width="130" height="18" rx="3" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.5" />
            <rect x="186" y="45" width="12" height="24" rx="2" fill="#0d9488" />
            <rect x="105" y="36" width="32" height="7" rx="2" fill="#64748b" />
            <polyline points="60,57 48,57 48,44" fill="none" stroke="#0f172a" strokeWidth="2" />
          </g>
          <text x="182" y="25" fontSize="9.5" fontWeight="600" fill="#0d9488">Front lens</text>
          <text x="95" y="26" fontSize="9.5" fill="#475569">Finder</text>
          <text x="18" y="48" fontSize="9.5" fontWeight="600" fill="#0f172a">Eyepiece</text>
          <text x="148" y="96" fontSize="9.5" fill="#475569">Alt-Az tripod</text>
        </svg>
      );
    case 'newtonian-dobsonian':
      return (
        <svg viewBox="0 0 260 130" className="guide-diagram" role="img" aria-label="Dobsonian reflector parts diagram">
          <rect x="0" y="0" width="260" height="130" rx="8" fill="#f8fafc" />
          {/* Rocker box */}
          <rect x="102" y="82" width="56" height="34" rx="3" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
          <rect x="92" y="114" width="76" height="6" rx="2" fill="#64748b" />
          {/* Tube */}
          <g transform="rotate(-32 130 78)">
            <rect x="75" y="64" width="120" height="26" rx="3" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.5" />
            <rect x="77" y="66" width="8" height="22" fill="#0d9488" />
            <rect x="172" y="54" width="10" height="10" fill="#0f172a" />
            <rect x="145" y="55" width="22" height="6" fill="#64748b" />
          </g>
          <text x="24" y="102" fontSize="9.5" fontWeight="600" fill="#0d9488">Primary mirror</text>
          <text x="168" y="24" fontSize="9.5" fontWeight="600" fill="#0f172a">Top eyepiece</text>
          <text x="168" y="102" fontSize="9.5" fill="#475569">Rocker base</text>
        </svg>
      );
    case 'mak-sct':
      return (
        <svg viewBox="0 0 260 130" className="guide-diagram" role="img" aria-label="Maksutov or SCT telescope diagram">
          <rect x="0" y="0" width="260" height="130" rx="8" fill="#f8fafc" />
          <line x1="130" y1="76" x2="100" y2="118" stroke="#64748b" strokeWidth="2.5" />
          <line x1="130" y1="76" x2="160" y2="118" stroke="#64748b" strokeWidth="2.5" />
          <rect x="95" y="42" width="72" height="32" rx="4" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.5" />
          <rect x="163" y="42" width="6" height="32" fill="#0d9488" />
          <polyline points="95,58 82,58 82,45" fill="none" stroke="#0f172a" strokeWidth="2" />
          <rect x="122" y="33" width="24" height="6" fill="#64748b" />
          <text x="174" y="58" fontSize="9.5" fontWeight="600" fill="#0d9488">Corrector lens</text>
          <text x="20" y="48" fontSize="9.5" fontWeight="600" fill="#0f172a">Rear eyepiece</text>
          <text x="108" y="26" fontSize="9.5" fill="#475569">Finder</text>
        </svg>
      );
    case 'goto-tracking':
      return (
        <svg viewBox="0 0 260 130" className="guide-diagram" role="img" aria-label="Computerized GoTo setup diagram">
          <rect x="0" y="0" width="260" height="130" rx="8" fill="#f8fafc" />
          <line x1="120" y1="74" x2="90" y2="118" stroke="#64748b" strokeWidth="2.5" />
          <line x1="120" y1="74" x2="150" y2="118" stroke="#64748b" strokeWidth="2.5" />
          <rect x="106" y="56" width="28" height="20" rx="3" fill="#0d9488" />
          <rect x="85" y="34" width="74" height="18" rx="3" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.5" />
          <rect x="180" y="72" width="52" height="34" rx="3" fill="#f1f5f9" stroke="#475569" strokeWidth="1.5" />
          <path d="M 134 68 Q 160 88 180 88" fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 2" />
          <text x="178" y="64" fontSize="9.5" fontWeight="600" fill="#0f172a">PC / Controller</text>
          <text x="42" y="68" fontSize="9.5" fontWeight="600" fill="#0d9488">Motorized mount</text>
        </svg>
      );
  }
};

export const ObservingGuide: React.FC<ObservingGuideProps> = ({
  selectedPass,
  timezone,
  locationName,
}) => {
  const [selectedSetupId, setSelectedSetupId] = useState<SetupId>('naked-eye');
  const setup: ObservingSetup = getSetupById(selectedSetupId);

  const startDir = selectedPass ? azimuthToCompass(selectedPass.startAzimuthDeg) : null;
  const peakDir = selectedPass ? azimuthToCompass(selectedPass.peakAzimuthDeg) : null;
  const endDir = selectedPass ? azimuthToCompass(selectedPass.endAzimuthDeg) : null;

  const prepMinutes = selectedSetupId === 'naked-eye' ? 5 : 15;
  const readyTimeMs = selectedPass ? selectedPass.startTimeMs - prepMinutes * 60_000 : null;

  return (
    <section className="panel guide-panel" aria-label="Telescope and Observing Guide">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Beginner Equipment &amp; Prep</p>
          <h2>
            <Telescope size={19} style={{ verticalAlign: '-3px', marginRight: 6 }} aria-hidden="true" />
            Telescope &amp; Observing Guide
          </h2>
        </div>
        <span className="filter-pill">6 setups · Pass-aware checklist</span>
      </div>

      {/* Prominent Solar Safety Warning */}
      <div className="solar-warning-banner" role="alert">
        <AlertTriangle size={20} aria-hidden="true" />
        <div>
          <strong>Solar safety warning:</strong> Never point a telescope, finder scope, or
          binoculars at or near the Sun without a certified solar filter designed specifically for
          that equipment. Doing so can cause instant, permanent eye damage.
        </div>
      </div>

      {/* Accurate ISS Beginner Expectation Note */}
      <div className="iss-expectation-note">
        <Eye size={16} aria-hidden="true" />
        <div>
          <strong>What to expect for the ISS:</strong> The International Space Station is usually
          easiest for beginners to spot with the <strong>naked eye</strong> as a bright, steady
          moving point of light. Tracking it through an ordinary telescope is difficult because it
          crosses the sky quickly, and normal GoTo mounts track stars and planets—not fast ISS
          passes automatically.
        </div>
      </div>

      {/* Equipment Selector */}
      <div className="guide-selector-wrap">
        <span className="metric-label">Choose your equipment to tailor the guide</span>
        <div className="guide-setup-tabs" role="tablist" aria-label="Observing equipment setups">
          {OBSERVING_SETUPS.map((item) => {
            const active = item.id === selectedSetupId;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`guide-tab ${active ? 'guide-tab-active' : ''}`}
                onClick={() => setSelectedSetupId(item.id)}
              >
                {item.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pass-Responsive Checklist */}
      <div className="guide-checklist-box">
        <div className="guide-checklist-header">
          <Compass size={17} aria-hidden="true" />
          <strong>
            {selectedPass
              ? `Checklist for ${selectedPass.satelliteName} · ${formatPassDate(selectedPass.startTimeMs, timezone)}`
              : 'Pass Observing Checklist'}
          </strong>
        </div>

        {selectedPass && readyTimeMs ? (
          <ol className="guide-checklist-steps">
            <li>
              <strong>Be ready by {formatPassTime(readyTimeMs, timezone)}</strong> ({prepMinutes}{' '}
              minutes before the {formatPassTime(selectedPass.startTimeMs, timezone)} start in{' '}
              {locationName.split(',')[0]}).{' '}
              {selectedSetupId === 'naked-eye'
                ? 'Step outside early so your eyes adjust to the dark.'
                : 'Set up your equipment on level ground, insert your widest low-power eyepiece, and align your finder.'}
            </li>
            <li>
              <strong>Face {startDir} ({selectedPass.startAzimuthDeg}°)</strong> just before{' '}
              {formatPassTime(selectedPass.startTimeMs, timezone)}. Use the{' '}
              <strong>Sky-Track Radar</strong> above (North is at the top, center is 90° straight
              overhead) to picture the teal path across your sky.
            </li>
            <li>
              <strong>Follow toward {peakDir} ({selectedPass.peakAzimuthDeg}°)</strong> at{' '}
              <strong>{selectedPass.maxElevationDeg.toFixed(0)}°</strong> elevation around{' '}
              {formatPassTime(selectedPass.peakTimeMs, timezone)}, then toward{' '}
              <strong>{endDir} ({selectedPass.endAzimuthDeg}°)</strong> until{' '}
              {formatPassTime(selectedPass.endTimeMs, timezone)}.
            </li>
          </ol>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            Select an upcoming pass above to generate an exact start time, compass direction, and
            Sky-Track Radar checklist for your chosen equipment.
          </p>
        )}
      </div>

      {/* Selected Equipment Detail Card */}
      <div className="guide-detail-card">
        <div className="guide-detail-top">
          <div>
            <h3>{setup.title}</h3>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              {setup.overview}
            </p>
          </div>
          <div className="guide-badges">
            <span className={`guide-badge guide-badge-${setup.suitabilityTone}`}>
              {setup.suitabilityBadge}
            </span>
            <span className="filter-pill">Skill: {setup.skillLevel}</span>
            <span className="filter-pill">Cost: {setup.costTier}</span>
          </div>
        </div>

        <div className="guide-iss-fit">
          <strong>ISS &amp; satellite suitability:</strong> {setup.issSuitability}
        </div>

        <div className="guide-diagram-and-parts">
          <div className="guide-diagram-box">
            <SetupDiagram setupId={setup.id} />
          </div>

          <div className="guide-parts-grid">
            <div>
              <span className="metric-label">Optics</span>
              <span>{setup.components.optics}</span>
            </div>
            <div>
              <span className="metric-label">Mount</span>
              <span>{setup.components.mount}</span>
            </div>
            <div>
              <span className="metric-label">Tripod / Base</span>
              <span>{setup.components.tripod}</span>
            </div>
            <div>
              <span className="metric-label">Finder</span>
              <span>{setup.components.finder}</span>
            </div>
            <div>
              <span className="metric-label">Eyepiece</span>
              <span>{setup.components.eyepiece}</span>
            </div>
            <div>
              <span className="metric-label">Phone / Camera Adapter</span>
              <span>{setup.components.adapter}</span>
            </div>
          </div>
        </div>

        <div className="guide-two-col">
          <div className="guide-subbox">
            <h4>
              <Wrench size={15} aria-hidden="true" /> Setup sequence
            </h4>
            <ol>
              {setup.setupSteps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="guide-subbox">
            <h4>
              <CheckCircle2 size={15} aria-hidden="true" /> Before the predicted pass
            </h4>
            <ul>
              {setup.beforePassSteps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="guide-mistakes-box">
          <h4>
            <HelpCircle size={15} aria-hidden="true" /> Common mistakes &amp; how to fix them
          </h4>
          <ul>
            {setup.commonMistakes.map((m, i) => (
              <li key={i}>
                <strong>{m.mistake}</strong> — {m.fix}
              </li>
            ))}
          </ul>
        </div>

        <p className="guide-limitations muted">
          <Layers size={14} aria-hidden="true" /> <strong>Limitations:</strong> {setup.limitations}
        </p>
      </div>
    </section>
  );
};
