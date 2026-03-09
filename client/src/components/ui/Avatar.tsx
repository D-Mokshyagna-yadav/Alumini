import { useState } from 'react';
import { User } from 'lucide-react';
import resolveMediaUrl from '../../lib/media';

interface AvatarProps {
    src?: string | null;
    alt?: string;
    iconSize?: number;
    iconClassName?: string;
    imgClassName?: string;
}

export default function Avatar({
    src,
    alt = '',
    iconSize = 18,
    iconClassName = 'text-[var(--bg-primary)]',
    imgClassName = 'w-full h-full object-cover',
}: AvatarProps) {
    const [error, setError] = useState(false);

    if (src && !error) {
        const resolved = src.startsWith('blob:') ? src : resolveMediaUrl(src);
        return (
            <img
                src={resolved}
                alt={alt}
                className={imgClassName}
                loading="lazy"
                decoding="async"
                onError={() => setError(true)}
            />
        );
    }

    return <User size={iconSize} className={iconClassName} />;
}
