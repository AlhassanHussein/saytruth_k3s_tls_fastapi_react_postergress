import { useState } from 'react';
import './CreateLinkSection.css';

const CreateLinkSection = ({ onCreateLink }) => {
    const [tempName, setTempName] = useState('');
    const [selectedDuration, setSelectedDuration] = useState('24h');
    const [isGenerating, setIsGenerating] = useState(false);

    const durations = [
        { value: '6h', label: '6 Hours' },
        { value: '12h', label: '12 Hours' },
        { value: '24h', label: '24 Hours' },
        { value: '1w', label: '1 Week' },
        { value: '1m', label: '1 Month' },
    ];

    const handleGenerate = () => {
        setIsGenerating(true);

        // Simulate link generation
        setTimeout(() => {
            const newLink = {
                id: Date.now(),
                name: tempName || 'Anonymous Link',
                duration: selectedDuration,
                createdAt: new Date(),
                publicUrl: `https://saytruth.app/l/${Math.random().toString(36).substr(2, 9)}`,
                privateUrl: `https://saytruth.app/p/${Math.random().toString(36).substr(2, 9)}`,
            };

            onCreateLink(newLink);
            setTempName('');
            setIsGenerating(false);
        }, 1000);
    };

    return (
        <section className="create-link-section">
            <div className="section-header">
                <h2 className="section-title">Create Anonymous Link</h2>
                <p className="section-subtitle">Generate a temporary link to receive anonymous messages</p>
            </div>

            <div className="create-link-form">
                <div className="form-group">
                    <label htmlFor="temp-name" className="form-label">
                        Link Name <span className="optional">(optional)</span>
                    </label>
                    <input
                        id="temp-name"
                        type="text"
                        className="input"
                        placeholder="e.g., Ask me anything"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        maxLength={50}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Duration</label>
                    <div className="duration-selector">
                        {durations.map((duration) => (
                            <button
                                key={duration.value}
                                className={`duration-btn ${selectedDuration === duration.value ? 'active' : ''}`}
                                onClick={() => setSelectedDuration(duration.value)}
                            >
                                {duration.label}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    className={`btn btn-primary generate-btn ${isGenerating ? 'generating' : ''}`}
                    onClick={handleGenerate}
                    disabled={isGenerating}
                >
                    {isGenerating ? (
                        <>
                            <span className="spinner"></span>
                            Generating...
                        </>
                    ) : (
                        <>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                            </svg>
                            Generate Link
                        </>
                    )}
                </button>
            </div>
        </section>
    );
};

export default CreateLinkSection;
