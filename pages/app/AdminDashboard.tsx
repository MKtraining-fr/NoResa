import React, { useState, useEffect } from 'react';
import { BarChart, Bar, Cell, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ClipboardCheck, UserPlus } from 'lucide-react';
import TrialSessionModal from './TrialSessionModal';
import { getDashboardStats, DashboardStats, getExpiringSubscriptions, ExpiringMember } from '../../lib/membersApi';
import { getGocardlessStats, GocardlessStats } from '../../lib/gocardless';
import { countMemberDues } from '../../lib/unpaidApi';
import { countPendingCancellations } from '../../lib/cancellationApi';
import DuplicateAlertsBanner from '../../components/DuplicateAlertsBanner';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, EmptyState, PageHeader, Skeleton, StatRow, Tag } from '../../components/ui';
import type { TagTone } from '../../components/ui/Tag';
import { dateLong, dateShort, eur, num } from '../../lib/format';
import { CHART } from '../../lib/chartTheme';

const STATUS_FR: Record<string, string> = {
  paid_out: 'versé', confirmed: 'confirmé', submitted: 'soumis', pending_submission: 'en attente',
  failed: 'échec', cancelled: 'annulé', charged_back: 'rejeté', customer_approval_denied: 'refusé',
};
const statusClass = (s: string) =>
  s === 'paid_out' || s === 'confirmed' ? 'text-success-text'
    : s === 'failed' || s === 'charged_back' || s === 'customer_approval_denied' ? 'text-danger-text'
      : 'text-muted';

const VISIBLE_RENEWALS = 5;

const renewalTag = (daysLeft: number): { tone: TagTone; label: string } => {
  if (daysLeft < 0) return { tone: 'danger', label: `Expiré · ${Math.abs(daysLeft)} j` };
  if (daysLeft === 0) return { tone: 'warning', label: "Expire aujourd'hui" };
  return { tone: daysLeft <= 7 ? 'warning' : 'neutral', label: `Expire · ${daysLeft} j` };
};

const ListSkeleton: React.FC = () => (
  <div className="space-y-3 pt-1">
    {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-9 w-full" />)}
  </div>
);

const AdminDashboard: React.FC = () => {
  const [isTrialModalOpen, setIsTrialModalOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [gc, setGc] = useState<GocardlessStats | null>(null);
  const [gcLoaded, setGcLoaded] = useState(false);
  const [expiring, setExpiring] = useState<ExpiringMember[]>([]);
  const [expiringLoaded, setExpiringLoaded] = useState(false);
  const [showAllRenewals, setShowAllRenewals] = useState(false);
  const [duesCount, setDuesCount] = useState(0);
  const [cancelCount, setCancelCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    getDashboardStats().then(setStats).catch(() => {});
    getGocardlessStats().then(setGc).catch(() => {}).finally(() => setGcLoaded(true));
    getExpiringSubscriptions(30).then(setExpiring).catch(() => {}).finally(() => setExpiringLoaded(true));
    countMemberDues().then(setDuesCount).catch(() => {});
    countPendingCancellations().then(setCancelCount).catch(() => {});
  }, []);

  // Attend GoCardless avant de tracer : sinon l'échelle change entre deux sources.
  const series = gcLoaded ? (gc?.revenue_series ?? stats?.revenue_series ?? []) : [];
  const revenueData = series.map((r) => ({
    name: new Date(r.month).toLocaleDateString('fr-FR', { month: 'short' }),
    revenue: Number(r.revenue),
  }));

  const gcValue = (value: React.ReactNode) => (gcLoaded ? (gc ? value : '—') : <Skeleton className="h-8 w-28" />);
  const renewals = showAllRenewals ? expiring : expiring.slice(0, VISIBLE_RENEWALS);

  return (
    <div className="space-y-5">
      <TrialSessionModal open={isTrialModalOpen} onClose={() => setIsTrialModalOpen(false)} />

      <PageHeader
        title="Tableau de bord"
        subtitle={dateLong()}
        actions={<>
          <Button variant="secondary" icon={ClipboardCheck} onClick={() => setIsTrialModalOpen(true)}>Séance d'essai</Button>
          <Button icon={UserPlus} to="/app/inscription">Nouvelle inscription</Button>
        </>}
      />

      <StatRow
        loading={!stats}
        stats={[
          { label: 'Membres actifs', value: stats ? num(stats.active_members) : '', sub: stats ? `sur ${num(stats.total_members)} fiches` : undefined },
          { label: 'Mandats actifs', value: gcValue(gc ? num(gc.mandates_active) : ''), sub: 'GoCardless' },
          { label: 'Encaissé · 30 j', value: gcValue(gc ? eur(gc.collected_30d) : ''), sub: 'Paiements confirmés' },
          { label: 'Revenu récurrent', value: stats ? eur(stats.mrr) : '', sub: stats ? `${num(stats.mandates_active)} mandats rattachés` : undefined },
        ]}
      />

      {duesCount > 0 && (
        <Alert tone="danger" title={`${duesCount} adhérent${duesCount > 1 ? 's' : ''} en impayé.`} action={{ label: 'Voir', onClick: () => navigate('/app/finance/impayes') }}>
          Prélèvement en échec : relancer ou bloquer l'accès.
        </Alert>
      )}

      {cancelCount > 0 && (
        <Alert tone="info" title={`${cancelCount} demande${cancelCount > 1 ? 's' : ''} de résiliation à traiter.`} action={{ label: 'Voir', onClick: () => navigate('/app/finance/resiliations') }}>
          Envoyée{cancelCount > 1 ? 's' : ''} par vos adhérents depuis l'app.
        </Alert>
      )}

      <DuplicateAlertsBanner />

      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr_1fr] gap-5">
        <Card title="Revenu encaissé" subtitle="6 derniers mois · GoCardless">
          {!gcLoaded ? (
            <Skeleton className="h-56 w-full" />
          ) : revenueData.length === 0 ? (
            <EmptyState title="Aucun revenu à afficher" />
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
                  <XAxis dataKey="name" axisLine={{ stroke: CHART.ink, strokeWidth: 2 }} tickLine={false} tick={{ fill: CHART.muted, fontSize: 13 }} />
                  <Tooltip
                    cursor={{ fill: CHART.ground }}
                    formatter={(v: number) => [eur(v), 'Encaissé']}
                    contentStyle={{ borderRadius: 0, border: `1px solid ${CHART.line}`, boxShadow: 'none', fontSize: 13 }}
                  />
                  <Bar dataKey="revenue" isAnimationActive={false}>
                    {revenueData.map((_, i) => <Cell key={i} fill={i === revenueData.length - 1 ? CHART.primary : CHART.ink} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Activité récente">
          {!gcLoaded ? <ListSkeleton /> : gc?.recent?.length ? (
            <div>
              {gc.recent.map((p, i) => (
                <div key={i} className="flex justify-between gap-3 py-2 border-b border-line-soft last:border-b-0">
                  <div className="min-w-0">
                    <div className="font-semibold tabular-nums">{eur(p.amount)}</div>
                    <div className={`text-sm ${statusClass(p.status)}`}>Prélèvement · {STATUS_FR[p.status] ?? p.status}</div>
                  </div>
                  <span className="text-sm text-muted whitespace-nowrap">{dateShort(p.date)}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Aucun prélèvement récent" />
          )}
        </Card>

        <Card title="À renouveler" action={expiring.length > 0 ? <Tag tone="warning">{expiring.length} sous 30 j</Tag> : undefined}>
          {!expiringLoaded ? <ListSkeleton /> : expiring.length === 0 ? (
            <EmptyState title="Rien à renouveler">Aucun abonnement hors prélèvement n'expire sous 30 jours.</EmptyState>
          ) : (
            <div>
              {renewals.map((m) => {
                const tag = renewalTag(m.days_left);
                return (
                  <button key={m.id} type="button" onClick={() => navigate(`/app/crm/membres?member=${m.id}`)} className="w-full flex items-center justify-between gap-3 py-2 border-b border-line-soft last:border-b-0 text-left hover:bg-ground-2 transition-colors">
                    <span className="min-w-0">
                      <span className="block font-semibold truncate">{m.first_name} {m.last_name}</span>
                      <span className="block text-sm text-muted truncate">{m.subscription_label || 'Abonnement'}{m.member_number ? ` · n° ${m.member_number}` : ''}</span>
                    </span>
                    <Tag tone={tag.tone} className="shrink-0">{tag.label}</Tag>
                  </button>
                );
              })}
              {expiring.length > VISIBLE_RENEWALS && (
                <Button variant="ghost" className="mt-2" onClick={() => setShowAllRenewals((v) => !v)}>
                  {showAllRenewals ? 'Réduire' : `Voir les ${expiring.length}`}
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
