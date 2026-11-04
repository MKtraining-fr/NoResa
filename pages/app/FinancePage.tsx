import React, { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Card, EmptyState, PageHeader, Skeleton, StatRow, Table, Tag, Td, Th, Tr, GroupRow } from '../../components/ui';
import type { TagTone } from '../../components/ui/Tag';
import { FORMULAS } from '../../lib/contractsApi';
import { getCollectionStats, getGocardlessStats, type CollectionStats, type GocardlessStats } from '../../lib/gocardless';
import { getDashboardStats, type DashboardStats } from '../../lib/membersApi';
import { listRecentPayments, type RecentPayment } from '../../lib/paymentsApi';
import { countMemberDues } from '../../lib/unpaidApi';
import { dateNum, dateShort, eur, num, pct } from '../../lib/format';

const GC_STATUS: Record<string, { label: string; tone: TagTone }> = {
  paid_out: { label: 'Versé', tone: 'success' },
  confirmed: { label: 'Confirmé', tone: 'success' },
  submitted: { label: 'Soumis', tone: 'warning' },
  pending_submission: { label: 'En attente', tone: 'warning' },
  pending_customer_approval: { label: 'En attente', tone: 'warning' },
  failed: { label: 'Échec', tone: 'danger' },
  charged_back: { label: 'Rejeté', tone: 'danger' },
  cancelled: { label: 'Annulé', tone: 'neutral' },
  customer_approval_denied: { label: 'Refusé', tone: 'danger' },
};

const PAYMENT_STATUS: Record<string, { label: string; tone: TagTone }> = {
  succeeded: { label: 'Encaissé', tone: 'success' },
  pending: { label: 'En attente', tone: 'warning' },
  failed: { label: 'Échec', tone: 'danger' },
  refunded: { label: 'Remboursé', tone: 'neutral' },
  cancelled: { label: 'Annulé', tone: 'neutral' },
};

const METHOD: Record<string, string> = {
  credit_card: 'Carte bancaire', stripe: 'Carte en ligne', cash: 'Espèces', cheque: 'Chèque', bank_transfer: 'Virement', sepa_debit: 'Prélèvement',
};

const formulaGroups = ['Engagement', 'Sans engagement'].map((group) => ({
  title: group === 'Engagement' ? 'Avec engagement' : 'Sans engagement',
  formulas: FORMULAS.filter((f) => f.group === group),
}));

const unitOf = (f: typeof FORMULAS[number]) => (f.recurring ? ' / mois' : f.periodicity === 'Annuel' ? ' / an' : '');
const engagementOf = (f: typeof FORMULAS[number]) => (!f.engagement ? 'Non' : f.recurring ? 'Oui, reconduit' : 'Oui');
const settlementOf = (f: typeof FORMULAS[number]) => (f.recurring ? 'Prélèvement' : f.engagement ? 'Comptant' : 'Comptoir');

const paymentLabel = (p: RecentPayment) => p.notes || (p.payment_type === 'product' ? 'Vente boutique' : 'Abonnement');

const FinancePage: React.FC<{ view?: string }> = ({ view = 'paiements' }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [gc, setGc] = useState<GocardlessStats | null>(null);
  const [gcLoaded, setGcLoaded] = useState(false);
  const [collection, setCollection] = useState<CollectionStats | null>(null);
  const [collectionLoaded, setCollectionLoaded] = useState(false);
  const [duesCount, setDuesCount] = useState<number | null>(null);
  const [payments, setPayments] = useState<RecentPayment[] | null>(null);
  const [paymentsError, setPaymentsError] = useState(false);

  useEffect(() => {
    getDashboardStats().then(setStats).catch(() => {});
    getGocardlessStats().then(setGc).catch(() => {}).finally(() => setGcLoaded(true));
    getCollectionStats().then(setCollection).finally(() => setCollectionLoaded(true));
    countMemberDues().then(setDuesCount).catch(() => setDuesCount(0));
  }, []);

  useEffect(() => {
    if (view !== 'paiements' || payments) return;
    listRecentPayments(100).then(setPayments).catch(() => { setPayments([]); setPaymentsError(true); });
  }, [view, payments]);

  const pending = (value: React.ReactNode, ready: boolean) => (ready ? value : <Skeleton className="h-8 w-28" />);

  return (
    <div className="space-y-5">
      <PageHeader
        title={view === 'abonnements' ? 'Abonnements' : 'Paiements'}
        subtitle={view === 'abonnements' ? 'Formules proposées et revenus récurrents' : 'Derniers encaissements enregistrés dans NoResa'}
      />

      <StatRow
        stats={[
          { label: 'Revenu mensuel (MRR)', value: pending(stats ? eur(stats.mrr) : '—', !!stats), sub: 'Mandats actifs' },
          {
            label: 'Taux de recouvrement',
            value: pending(collection?.rate != null ? pct(collection.rate) : '—', collectionLoaded),
            sub: collection ? `${num(collection.paid)} payés, ${num(collection.failed)} en échec · 30 j` : 'Prélèvements · 30 j',
          },
          { label: 'Paiements en attente', value: pending(collection ? num(collection.pending) : '—', collectionLoaded), sub: 'Prélèvements GoCardless' },
          { label: 'Impayés', value: pending(duesCount != null ? num(duesCount) : '—', duesCount != null), sub: 'Adhérents concernés' },
        ]}
      />

      {view === 'abonnements' ? (
        <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-5 items-start">
          <Table>
            <thead>
              <tr><Th>Formule</Th><Th>Prix</Th><Th>Engagement</Th><Th>Règlement</Th></tr>
            </thead>
            <tbody>
              {formulaGroups.map((g) => (
                <Fragment key={g.title}>
                  <GroupRow colSpan={4}>{g.title}</GroupRow>
                  {g.formulas.map((f) => (
                    <Tr key={f.key}>
                      <Td className="font-semibold">{f.label.split('—')[0].trim()}{f.label.includes('—') ? <span className="block text-sm font-normal text-muted">{f.label.split('—')[1].trim()}</span> : null}</Td>
                      <Td className="whitespace-nowrap">{eur(f.price)}<span className="text-muted">{unitOf(f)}</span></Td>
                      <Td>{engagementOf(f)}</Td>
                      <Td>{settlementOf(f)}</Td>
                    </Tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </Table>

          <Card ruled title="Derniers prélèvements">
            {!gcLoaded ? (
              <div className="space-y-3">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-7 w-full" />)}</div>
            ) : gc?.recent?.length ? (
              <div>
                {gc.recent.map((p, i) => {
                  const s = GC_STATUS[p.status] ?? { label: p.status, tone: 'neutral' as TagTone };
                  return (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-line-soft last:border-b-0">
                      <span className="font-semibold tabular-nums">{eur(p.amount)}</span>
                      <span className="text-sm text-muted">{dateShort(p.date)}</span>
                      <Tag tone={s.tone} className="ml-auto">{s.label}</Tag>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="Aucun prélèvement récent" />
            )}
          </Card>
        </div>
      ) : (
        <>
          {paymentsError && <Alert tone="danger" title="Chargement impossible.">Réessaie dans un instant.</Alert>}
          <Table>
            <thead>
              <tr><Th>Date</Th><Th>Membre</Th><Th>Libellé</Th><Th>Mode</Th><Th className="text-right">Montant</Th><Th>Statut</Th></tr>
            </thead>
            <tbody>
              {!payments && [0, 1, 2, 3, 4, 5].map((i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-2.5 border-b border-line-soft"><Skeleton className="h-5 w-full" /></td></tr>
              ))}
              {payments?.map((p) => {
                const s = PAYMENT_STATUS[p.status ?? ''] ?? { label: p.status ?? '—', tone: 'neutral' as TagTone };
                return (
                  <Tr key={p.id} onClick={p.member_id ? () => navigate(`/app/crm/membres?member=${p.member_id}`) : undefined}>
                    <Td className="whitespace-nowrap">{p.payment_date ? dateNum(p.payment_date) : null}</Td>
                    <Td className="font-semibold">{p.member_name}</Td>
                    <Td className="max-w-md truncate">{paymentLabel(p)}</Td>
                    <Td>{p.payment_method ? (METHOD[p.payment_method] ?? p.payment_method) : null}</Td>
                    <Td className="text-right whitespace-nowrap font-semibold">{eur(Number(p.amount))}</Td>
                    <Td><Tag tone={s.tone}>{s.label}</Tag></Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
          {payments?.length === 0 && !paymentsError && <EmptyState title="Aucun paiement enregistré" />}
        </>
      )}
    </div>
  );
};

export default FinancePage;
