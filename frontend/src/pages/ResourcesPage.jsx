/**
 * ResourcesPage — matches reference site design.
 * Large 2-column image grid, big Fraunces heading, calm framing.
 */
import { ExternalLink } from 'lucide-react'

const RESOURCES = [
  {
    id: 'vedi-herbals',
    name: 'Vedi Herbals',
    source: 'Ayurveda · Herbs & Remedies',
    description: 'Herb-by-herb guidance on Ayurvedic approaches to hormonal balance — rooted in classical texts.',
    url: 'https://vediherbals.com/blogs/blog/hormonal-imbalance-treatment-in-ayurveda',
    img: '/resource1.png',
  },
  {
    id: 'apollo-ayurvaid',
    name: 'Apollo AyurVAID',
    source: 'Ayurveda · Medicines & Treatment',
    description: 'Research-backed Ayurvedic treatment information for hormonal imbalance from a clinical Ayurvedic group.',
    url: 'https://ayurvaid.com/blog/restoring-harmony-ayurveda-management-of-hormonal-imbalance/',
    img: '/resource2.png',
  },
  {
    id: 'sri-sri-ayurveda',
    name: 'Sri Sri Ayurveda Hospital',
    source: 'Ayurveda · Herbs & Consultation',
    description: 'Five classical Ayurvedic remedies for managing hormonal imbalance — lifestyle and herbs.',
    url: 'https://srisriayurvedahospital.org/5-remedies-to-manage-hormonal-imbalance/',
    img: '/resource3.png',
  },
  {
    id: 'kairali-ayurvedic',
    name: 'Kairali Ayurvedic Healing Village',
    source: 'Ayurveda · Therapy & Herbs',
    description: 'Panchakarma and endocrine therapies for women\'s hormonal balance at a residential healing centre.',
    url: 'https://ayurvedichealingvillage.com/womens-hormonal-balance-endocrine-therapy/',
    img: '/resource4.png',
  },
]

export default function ResourcesPage() {
  return (
    <div className="page-outer">
      {/* Eyebrow */}
      <span className="eyebrow">RESOURCES</span>

      {/* Hero heading */}
      <h1 className="section-heading">
        Starting <span className="accent">points,</span> not prescriptions.
      </h1>

      <p className="body-soft" style={{ maxWidth: 560, marginBottom: '2.5rem' }}>
        A handful of Ayurvedic and holistic wellness places worth reading if you want to
        explore alongside a clinician. Nothing here is a treatment plan.
      </p>

      {/* Image card grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.25rem',
          marginBottom: '3rem',
        }}
        role="list"
        aria-label="Ayurvedic health resources"
      >
        {RESOURCES.map((res) => (
          <a
            key={res.id}
            id={`resource-${res.id}`}
            href={res.url}
            target="_blank"
            rel="noopener noreferrer"
            className="resource-card"
            role="listitem"
            aria-label={`${res.name}: ${res.description}. Opens in new tab.`}
          >
            <img
              src={res.img}
              alt={`${res.name} — ${res.source}`}
              className="resource-card-img"
              loading="lazy"
            />
            <div className="resource-card-body">
              <span className="resource-card-source">{res.source}</span>
              <h2 className="resource-card-title">{res.name}</h2>
              <p className="resource-card-desc">{res.description}</p>
              <span className="resource-card-link">
                Visit site <ExternalLink size={12} aria-hidden />
              </span>
            </div>
          </a>
        ))}
      </div>

      {/* Disclaimers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div className="note-banner" role="note">
          <strong>NOTE</strong>
          This app provides general wellness information and symptom tracking. It is not a substitute for professional medical advice, diagnosis, or treatment. In an emergency, contact local emergency services.
        </div>
        <div className="note-banner" role="note">
          <strong>THIRD PARTY</strong>
          The resources above are maintained by third parties that BalanceCycle does not control or medically endorse. Verify any health information with a qualified healthcare professional before acting on it.
        </div>
      </div>
    </div>
  )
}
