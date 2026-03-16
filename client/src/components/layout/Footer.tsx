import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Mail, Phone, MapPin, Facebook, Linkedin, Instagram, Youtube } from 'lucide-react';

const Footer = () => {
    const location = useLocation();
        type FooterLink = { name: string; href: string; external?: boolean };
        const footerLinks: { [section: string]: FooterLink[] } = {
            'About': [
                { name: 'Our Story', href: 'https://www.mictech.edu.in/about-college', external: true },
                { name: 'Leadership', href: 'https://www.mictech.edu.in/leadership', external: true },
                { name: 'Careers', href: '/jobs' },
            ],
            'Community': [
                { name: 'Alumni Directory', href: '/directory' },
                { name: 'Events', href: '/events' },
            ],
            'Resources': [
                { name: 'Give Back', href: '/contact' },
                { name: 'Contact Us', href: '/contact' },
            ],
        };

    const socialLinks = [
        { icon: Facebook, href: 'https://www.facebook.com/share/1FW4X3wiyG/', label: 'Facebook' },
        { icon: Linkedin, href: 'https://in.linkedin.com/school/dvr-dr-hs-mic-college-of-technology/', label: 'LinkedIn' },
        { icon: Instagram, href: 'https://www.instagram.com/miccollegeoftechnology?igsh=MWxobjd4czN1bXY2bg==', label: 'Instagram' },
        { icon: Youtube, href: 'https://www.youtube.com/@dvrdr.hsmiccollegeoftechno8260', label: 'YouTube' },
    ];

    const [branding, setBranding] = useState<any>({});

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                const res = await api.get('/public/branding');
                if (!mounted) return;
                setBranding(res.data.branding || {});
            } catch (err) {
                if (!mounted) return;
                setBranding({});
            }
        };
        load();
        return () => { mounted = false };
    }, []);

    return (
        <footer className="bg-[var(--bg-secondary)] border-t border-[var(--accent)]/10 relative overflow-hidden">
            {/* Background decoration — blue gradient wash */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-[var(--accent)]/[0.04] via-transparent to-transparent" />
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-[var(--accent)]/[0.06] blur-3xl rounded-full" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[var(--gradient-end)]/[0.05] blur-3xl rounded-full" />
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 relative">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 md:gap-12 mb-16">
                    {/* Brand */}
                    <div className="col-span-2">
                        <Link to="/" className="flex items-center gap-3 mb-6 group">
                            <img src="/logo-small.png" alt="Logo" className="w-12 h-12 rounded-xl object-contain" />
                            <div>
                                <span className="font-bold text-lg text-[var(--text-primary)] block leading-tight group-hover:text-[var(--accent)] transition-colors">
                                    {branding.name || 'Alumni Network'}
                                </span>
                                <span className="text-xs text-[var(--text-muted)]">{branding.estYear ? `Est. ${branding.estYear}` : ''}</span>
                            </div>
                        </Link>
                        <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-xs mb-6">
                            {branding.tagline || 'Connecting generations of excellence. Building bridges between past, present, and future.'}
                        </p>

                        <div className="flex gap-2">
                            {socialLinks.map((social) => (
                                <a
                                    key={social.label}
                                    href={branding.social?.[social.label.toLowerCase()] || social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={social.label}
                                    className="w-10 h-10 bg-[var(--bg-tertiary)] rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--accent)] hover:text-[var(--bg-primary)] hover:-translate-y-0.5 border border-[var(--border-color)] hover:border-[var(--accent)] transition-all duration-200"
                                >
                                    <social.icon size={18} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Links */}
                    {Object.entries(footerLinks).map(([title, links]) => (
                        <div key={title}>
                            <h3 className="font-bold text-sm text-[var(--text-primary)] uppercase tracking-wider mb-5">
                                {title}
                            </h3>
                            <ul className="space-y-3">
                                {links.map((link) => (
                                    <li key={link.name}>
                                        {link.external ? (
                                            <a
                                                href={link.href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors inline-flex items-center gap-1 group"
                                            >
                                                <span className="w-0 group-hover:w-2 h-0.5 bg-[var(--accent)] transition-all duration-300" />
                                                {link.name}
                                            </a>
                                        ) : (
                                            <Link
                                                to={link.href}
                                                onClick={() => {
                                                    const [targetPath, targetHash] = link.href.split('#');
                                                    if (location.pathname !== targetPath) return;

                                                    if (targetHash) {
                                                        const el = document.getElementById(targetHash);
                                                        if (el) {
                                                            setTimeout(() => {
                                                                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                            }, 0);
                                                        }
                                                        return;
                                                    }

                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                                className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors inline-flex items-center gap-1 group"
                                            >
                                                <span className="w-0 group-hover:w-2 h-0.5 bg-[var(--accent)] transition-all duration-300" />
                                                {link.name}
                                            </Link>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Contact Bar */}
                <div
                    className="bg-[var(--bg-tertiary)]/60 backdrop-blur-sm p-6 mb-12 border border-[var(--border-color)] rounded-2xl"
                >
                    <div className="flex flex-wrap justify-center gap-4 sm:gap-8 text-sm">
                        <a href={`mailto:${branding.contactEmail || 'alumni@mictech.ac.in'}`} className="flex items-center gap-3 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors group">
                            <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center group-hover:bg-[var(--accent)] group-hover:text-[var(--bg-primary)] transition-all duration-200">
                                <Mail size={18} />
                            </div>
                            <span>{branding.contactEmail || 'alumni@mictech.ac.in'}</span>
                        </a>
                        <a href={`tel:${branding.contactPhone || '+91 73826 16824'}`} className="flex items-center gap-3 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors group">
                            <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center group-hover:bg-[var(--accent)] group-hover:text-[var(--bg-primary)] transition-all duration-200">
                                <Phone size={18} />
                            </div>
                            <span>{branding.contactPhone || '+91 73826 16824'}</span>
                        </a>
                        <a
                            href="https://maps.app.goo.gl/At32ZftUx8VvVjVBA"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 text-[var(--accent)] underline hover:text-[var(--gradient-end)] transition-colors group"
                        >
                            <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center">
                                <MapPin size={18} className="text-[var(--accent)]" />
                            </div>
                            Kanchikacherla, AP, India
                        </a>
                    </div>
                </div>

                {/* Bottom */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-[var(--border-color)]">
                    <p className="text-sm text-[var(--text-muted)] flex items-center gap-1">
                        © {new Date().getFullYear()} {branding.name || 'Alumni Association'}.
                        All rights reserved.
                    </p>
                    <div className="flex gap-6 text-sm">
                        <a href="#" className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">Privacy Policy</a>
                        <a href="#" className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">Terms of Service</a>
                        <a href="#" className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">Cookies</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
