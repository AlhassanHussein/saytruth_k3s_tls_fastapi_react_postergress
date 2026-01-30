import LinkCard from './LinkCard';
import './ActiveLinksSection.css';

const ActiveLinksSection = ({ links, onDeleteLink }) => {
    return (
        <section className="active-links-section">
            <div className="section-header">
                <h2 className="section-title">Active Links</h2>
                <span className="links-count">{links.length} {links.length === 1 ? 'link' : 'links'}</span>
            </div>

            {links.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🔗</div>
                    <h3 className="empty-title">No active links yet</h3>
                    <p className="empty-description">
                        Create your first anonymous link to start receiving messages
                    </p>
                </div>
            ) : (
                <div className="links-grid">
                    {links.map((link) => (
                        <LinkCard key={link.id} link={link} onDelete={onDeleteLink} />
                    ))}
                </div>
            )}
        </section>
    );
};

export default ActiveLinksSection;
