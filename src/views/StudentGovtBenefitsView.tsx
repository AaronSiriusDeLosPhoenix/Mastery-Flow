import React from 'react';
import { GovtBenefitsHub } from '../components/GovtBenefitsHub.js';
import { useApp } from '../context/AppContext.js';
import { ArrowLeft, ExternalLink, ShieldCheck, Landmark } from 'lucide-react';

const OFFICIAL_PORTALS = [
  {
    name: 'National Scholarship Portal (NSP 2.0)',
    domain: 'scholarships.gov.in',
    url: 'https://scholarships.gov.in',
    ministry: 'Ministry of Electronics & IT / MoE',
    scope: 'OTR Registration, Central Sector, AICTE Pragati & Saksham DBT',
  },
  {
    name: 'PM-Vidyalaxmi Higher Ed Credit Hub',
    domain: 'pmvidyalaxmi.co.in',
    url: 'https://pmvidyalaxmi.co.in',
    ministry: 'Department of Higher Education',
    scope: 'Collateral-Free QHEI Loans & 3% Interest Subvention e-Vouchers',
  },
  {
    name: 'JanSamarth Central Subsidy Portal',
    domain: 'jansamarth.in',
    url: 'https://www.jansamarth.in',
    ministry: 'Ministry of Finance & MoE',
    scope: '100% CSIS Moratorium Interest Subsidy (Income ≤ ₹4.5L)',
  },
  {
    name: 'IIT PAL (Professor Assisted Learning)',
    domain: 'iitpal.iitd.ac.in',
    url: 'https://iitpal.iitd.ac.in',
    ministry: 'IIT Delhi & SWAYAM Prabha Ch. 19–22',
    scope: 'Free IIT Faculty Video Lectures & Live Mentoring for JEE/NEET',
  },
  {
    name: 'PM e-Vidya & DIKSHA Digital Grid',
    domain: 'pmevidya.education.gov.in',
    url: 'https://pmevidya.education.gov.in',
    ministry: 'NCERT & Ministry of Education',
    scope: '200 DTH Channels, QR Textbooks & Accessible CwSN Resources',
  },
  {
    name: 'NTA National Test Abhyas (e-Abhyas)',
    domain: 'nta.ac.in/abhyas',
    url: 'https://www.nta.ac.in/abhyas',
    ministry: 'National Testing Agency (NTA)',
    scope: 'Official AI Mock Tests for JEE Main & NEET with Time Telemetry',
  },
  {
    name: 'Academic Bank of Credits (ABC / APAAR)',
    domain: 'abc.gov.in',
    url: 'https://www.abc.gov.in',
    ministry: 'University Grants Commission (UGC)',
    scope: 'NEP 2020 Credit Mobility & 12-Digit Lifetime Student ID',
  },
  {
    name: 'SWAYAM & NPTEL Online Certification',
    domain: 'swayam.gov.in',
    url: 'https://swayam.gov.in',
    ministry: 'IIT Madras & 7 IITs / IISc',
    scope: 'Up to 40% University Credit Transfer & Exam Fee Waivers',
  },
];

export const StudentGovtBenefitsView: React.FC = () => {
  const { setActiveView } = useApp();

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Back Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView('student_dashboard')}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Learner Dashboard</span>
          </button>
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Verified Government of India Student Portals</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Government Benefits & Scholarships Hub */}
      <GovtBenefitsHub compact={false} />

      {/* Direct Authorized Portal Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-blue-700" />
              <span>Authorized National Portals Directory</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Direct verified endpoints for scholarships, interest subvention, credit transfer, and IIT/NTA preparation
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 pr-4">Portal Name</th>
                <th className="py-2.5 px-4">Nodal Authority</th>
                <th className="py-2.5 px-4">Core Student Benefit</th>
                <th className="py-2.5 pl-4 text-right">Official Domain</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {OFFICIAL_PORTALS.map((portal) => (
                <tr key={portal.domain} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 pr-4 font-bold text-slate-900">{portal.name}</td>
                  <td className="py-3 px-4 text-slate-600">{portal.ministry}</td>
                  <td className="py-3 px-4 text-slate-600">{portal.scope}</td>
                  <td className="py-3 pl-4 text-right font-mono tabular-nums">
                    <a
                      href={portal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 font-medium"
                    >
                      <span>{portal.domain}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
