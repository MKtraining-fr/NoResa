import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, PlayCircle, MapPin, Clock, ArrowRight } from 'lucide-react';
import { parseVideo } from '../../../lib/videoEmbed';

const RED = '#C81E1E';

/* ------------------------------------------------------------------ *
 *  CONTENU À PERSONNALISER
 *  - PHOTOS : mets les URLs de tes photos (fichiers déposés dans /public
 *    ou liens). Laisse vide -> emplacements gris "photo à venir".
 *  - VIDEO_URL : un lien YouTube ou Vimeo (visite de la salle). Vide -> masqué.
 * ------------------------------------------------------------------ */
const PHOTOS: string[] = [];
const VIDEO_URL = '';

const DecouvertePage: React.FC = () => {
  const video = VIDEO_URL ? parseVideo(VIDEO_URL) : null;
  const tiles = PHOTOS.length ? PHOTOS : new Array(6).fill('');

  return (
    <div>
      {/* Intro */}
      <section className="max-w-6xl mx-auto px-5 pt-12">
        <p className="text-sm font-bold uppercase tracking-widest" style={{ color: RED }}>Découverte</p>
        <h1 className="text-4xl font-extrabold text-gray-900 mt-1 text-balance">Bienvenue à La SaLLe.</h1>
        <p className="text-gray-500 font-medium mt-3 max-w-2xl">Un espace pensé pour t'entraîner à ton rythme, matériel complet et ambiance conviviale, à deux pas de chez toi. Jette un œil.</p>
        <div className="flex flex-wrap gap-4 mt-4 text-sm font-semibold text-gray-600">
          <span className="inline-flex items-center gap-1.5"><MapPin size={15} style={{ color: RED }} /> Villeneuve-la-Comptal</span>
          <span className="inline-flex items-center gap-1.5"><Clock size={15} style={{ color: RED }} /> Lun–Ven 6h–23h · Week-end 7h–20h</span>
        </div>
      </section>

      {/* Vidéo (si fournie) */}
      {video && video.embedUrl && (
        <section className="max-w-6xl mx-auto px-5 mt-8">
          <div className="relative rounded-3xl overflow-hidden bg-black aspect-video shadow-xl">
            <iframe src={video.embedUrl} title="Visite de La SaLLe" className="absolute inset-0 w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        </section>
      )}

      {/* Galerie photos */}
      <section className="max-w-6xl mx-auto px-5 mt-10">
        <h2 className="text-lg font-extrabold text-gray-900 mb-4 flex items-center gap-2"><Camera size={18} style={{ color: RED }} /> La salle en images</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {tiles.map((src, i) => (
            src ? (
              <img key={i} src={src} alt={`La SaLLe ${i + 1}`} className="w-full aspect-[4/3] object-cover rounded-2xl" />
            ) : (
              <div key={i} className="w-full aspect-[4/3] rounded-2xl bg-gray-100 border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300 gap-1">
                <Camera size={26} />
                <span className="text-[11px] font-semibold">Photo à venir</span>
              </div>
            )
          ))}
        </div>
        {!PHOTOS.length && (
          <p className="text-[12px] text-gray-400 mt-3 flex items-center gap-1.5"><PlayCircle size={13} /> Les photos et la vidéo de la salle seront ajoutées ici.</p>
        )}
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-5 mt-12">
        <div className="rounded-3xl p-8 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ background: `linear-gradient(160deg, ${RED}, #8E1414)` }}>
          <div>
            <p className="text-2xl font-extrabold">Prêt à essayer ?</p>
            <p className="opacity-90 font-medium mt-1">Inscris-toi en 2 minutes, ou viens à la séance.</p>
          </div>
          <div className="flex gap-3">
            <Link to="/tarifs" className="bg-white/10 border border-white/30 font-bold px-5 py-3 rounded-xl">Voir les tarifs</Link>
            <Link to="/inscription" className="bg-white font-bold px-5 py-3 rounded-xl inline-flex items-center gap-2" style={{ color: RED }}>M'inscrire <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DecouvertePage;
