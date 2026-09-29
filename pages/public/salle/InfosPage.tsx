import React, { useEffect, useState } from 'react';
import { Megaphone, Loader2, Tag, Calendar, AlertTriangle, Info } from 'lucide-react';
import { getPublicAnnouncements, PublicAnnouncement, AnnouncementCategory } from '../../../lib/announcementsApi';
import { parseVideo } from '../../../lib/videoEmbed';

const RED = '#C81E1E';

const CAT: Record<AnnouncementCategory, { label: string; cls: string; Icon: React.ElementType }> = {
  info:  { label: 'Info',       cls: 'bg-blue-50 text-blue-700',    Icon: Info },
  promo: { label: 'Promo',      cls: 'bg-red-50 text-red-700',      Icon: Tag },
  event: { label: 'Événement',  cls: 'bg-indigo-50 text-indigo-700', Icon: Calendar },
  alert: { label: 'Alerte',     cls: 'bg-amber-50 text-amber-700',  Icon: AlertTriangle },
};

const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

const Media: React.FC<{ url: string }> = ({ url }) => {
  const v = parseVideo(url);
  if (v.embedUrl) {
    return (
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-video mb-4">
        <iframe src={v.embedUrl} title="Vidéo" className="absolute inset-0 w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      </div>
    );
  }
  if (v.kind === 'file') {
    return <video src={url} controls className="w-full rounded-2xl mb-4 bg-black" />;
  }
  // sinon : image
  return <img src={url} alt="" className="w-full rounded-2xl mb-4 object-cover max-h-80" />;
};

const InfosPage: React.FC = () => {
  const [items, setItems] = useState<PublicAnnouncement[] | null>(null);
  useEffect(() => { getPublicAnnouncements().then(setItems); }, []);

  return (
    <div className="max-w-3xl mx-auto px-5 py-12">
      <p className="text-sm font-bold uppercase tracking-widest" style={{ color: RED }}>Infos</p>
      <h1 className="text-4xl font-extrabold text-gray-900 mt-1 text-balance">Les actus de La SaLLe.</h1>
      <p className="text-gray-500 font-medium mt-3">Nouveautés, promotions et informations de ta salle.</p>

      {items === null ? (
        <div className="flex items-center justify-center py-20 text-gray-300"><Loader2 className="animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center">
          <Megaphone size={36} className="mx-auto text-gray-300" />
          <p className="mt-3 font-semibold text-gray-500">Aucune info pour le moment.</p>
          <p className="text-sm text-gray-400">Reviens bientôt pour les nouveautés et promos.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-5">
          {items.map((a) => {
            const c = CAT[a.category] || CAT.info;
            return (
              <article key={a.id} className="border border-gray-100 rounded-3xl p-6 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-lg ${c.cls}`}>
                    <c.Icon size={13} /> {c.label}
                  </span>
                  <span className="text-[12px] font-semibold text-gray-400">{fmtDate(a.publishedAt)}</span>
                </div>
                <h2 className="text-xl font-extrabold text-gray-900 mb-2">{a.title}</h2>
                {a.mediaUrl && <Media url={a.mediaUrl} />}
                {a.body && <p className="text-[15px] leading-relaxed text-gray-600 font-medium whitespace-pre-line">{a.body}</p>}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InfosPage;
