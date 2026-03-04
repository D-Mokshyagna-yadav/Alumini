import { useEffect, useState } from 'react';
import api from '../lib/api';
import Hero from '../components/landing/Hero';
import StatsBar from '../components/landing/StatsBar';
import NotableAlumni from '../components/landing/NotableAlumni';
import Timeline from '../components/landing/Timeline';
import Leaders from '../components/landing/Leaders';
import Departments from '../components/landing/Departments';
import CTA from '../components/landing/CTA';

interface HomePayload {
    hero?: any;
    stats?: any[];
    leaders?: any[];
    departments?: any[];
    timeline?: any[];
    notable?: any[];
    cta?: any;
}

const Landing = () => {
    const [home, setHome] = useState<HomePayload | null>(null);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                const res = await api.get('/public/home');
                if (!mounted) return;
                setHome(res.data.home || null);
            } catch (err) {
                console.error('Failed to load home content', err);
            }
        };
        load();
        return () => { mounted = false };
    }, []);

    return (
        <div className="min-h-screen">
            <Hero data={home?.hero} />
            <StatsBar stats={home?.stats} />
            <Leaders data={home?.leaders} />
            <Departments data={home?.departments} />
            <Timeline data={home?.timeline} />
            <NotableAlumni data={home?.notable} />
            <CTA data={home?.cta} />
        </div>
    );
};

export default Landing;
