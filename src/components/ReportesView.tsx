/**
 * CHECKPOINT: Infinity Systems ERP - Version 1.5 (Responsive & Task Optimization)
 */
import React, { useState, useEffect } from 'react';
import { FileText, Search, ExternalLink, Package, User as UserIcon, Calendar, MapPin } from 'lucide-react';
import { Report, ReportItem, User } from '../types';

interface ExtendedReport extends Report {
  client_name: string;
  client_location?: string;
  service_date?: string;
  client_branch: string;
  task_problem?: string;
  tecnico?: string; // Not real, just placeholder
}

export default function ReportesView({ user }: { user: User }) {
  const [reports, setReports] = useState<ExtendedReport[]>([]);
  const [search, setSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState<ExtendedReport | null>(null);
  const [reportItems, setReportItems] = useState<ReportItem[]>([]);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    const res = await fetch('/api/reports');
    const data = await res.json();
    setReports(data);
  };

  const fetchReportItems = async (reportId: number) => {
    const res = await fetch(`/api/reports/${reportId}/items`);
    const data = await res.json();
    setReportItems(data);
  };

  const handleViewReport = (report: ExtendedReport) => {
    setSelectedReport(report);
    if (report.type === 'instalacion') {
      fetchReportItems(report.id);
    }
  };

  const filteredReports = reports.filter(r => 
    r.client_name.toLowerCase().includes(search.toLowerCase()) ||
    r.description.toLowerCase().includes(search.toLowerCase())
  );

  // Group by client
  const groupedReports = filteredReports.reduce((acc, report) => {
    if (!acc[report.client_name]) acc[report.client_name] = [];
    acc[report.client_name].push(report);
    return acc;
  }, {} as Record<string, ExtendedReport[]>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="text-xl md:text-2xl font-bold text-black tracking-tight">Archivo de Reportes</h3>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" size={16} />
          <input 
            type="text" 
            placeholder="Buscar por cliente o contenido..." 
            className="pl-10 pr-4 py-2 bg-white rounded-xl text-sm border border-black/5 focus:ring-1 focus:ring-black w-full"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Report List Grouped by Client */}
        <div className={`lg:col-span-1 space-y-6 ${selectedReport ? 'hidden lg:block' : 'block'}`}>
          {Object.entries(groupedReports).map(([clientName, clientReports]: [string, ExtendedReport[]]) => (
            <div key={clientName} className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 ml-2">{clientName}</h4>
              <div className="space-y-2">
                {clientReports.map(report => (
                  <div 
                    key={report.id}
                    onClick={() => handleViewReport(report)}
                    className={`
                      p-4 rounded-xl border cursor-pointer transition-all
                      ${selectedReport?.id === report.id ? 'bg-black text-white border-black shadow-md' : 'bg-white border-black/5 hover:border-black/20'}
                    `}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                        {report.type.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] opacity-40">
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs font-medium truncate">{report.description}</p>
                    <div className="mt-2 flex items-center gap-2 text-[10px] opacity-40">
                      <MapPin size={10} />
                      {report.client_branch}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(groupedReports).length === 0 && (
            <div className="p-12 text-center text-black/20 text-sm font-medium">
              No se encontraron reportes.
            </div>
          )}
        </div>

        {/* Report Detail View */}
        <div className={`lg:col-span-2 ${selectedReport ? 'block' : 'hidden lg:block'}`}>
          {selectedReport ? (
            <div className="bg-white rounded-2xl border border-black/5 p-4 md:p-8 shadow-sm space-y-8 sticky top-24">
              <button 
                onClick={() => setSelectedReport(null)}
                className="lg:hidden flex items-center gap-2 text-black/40 hover:text-black mb-4 font-bold text-xs uppercase tracking-widest"
              >
                &larr; Volver al listado
              </button>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-black/5 pb-6 gap-4">
                <div>
                  <h4 className="text-2xl font-bold text-black tracking-tight">{selectedReport.client_name}</h4>
                  <p className="text-black/40 text-sm font-medium">{selectedReport.client_branch}</p>
                </div>
                <div className="text-right">
                  <div className="px-3 py-1 bg-black text-white rounded-full text-[10px] font-bold uppercase tracking-widest mb-2 inline-block">
                    {selectedReport.type.replace('_', ' ')}
                  </div>
                  <p className="text-[10px] text-black/30 font-bold uppercase tracking-widest">
                    ID Reporte: #{selectedReport.id.toString().padStart(4, '0')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h5 className="text-[10px] font-bold uppercase tracking-widest text-black/40">Detalles del Servicio</h5>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar size={16} className="text-black/30" />
                      <span className="text-black/60">Fecha:</span>
                      <span className="font-medium">{selectedReport.service_date || new Date(selectedReport.created_at).toLocaleDateString()}</span>
                    </div>
                    {selectedReport.client_location && (
                      <div className="flex items-start gap-3 text-sm">
                        <MapPin size={16} className="text-black/30 mt-0.5" />
                        <span className="text-black/60">Dirección:</span>
                        <span className="font-medium flex-1">{selectedReport.client_location}</span>
                      </div>
                    )}
                    {selectedReport.task_problem && (
                      <div className="flex items-start gap-3 text-sm">
                        <FileText size={16} className="text-black/30 mt-0.5" />
                        <span className="text-black/60">Motivo:</span>
                        <span className="font-medium leading-relaxed">{selectedReport.task_problem}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h5 className="text-[10px] font-bold uppercase tracking-widest text-black/40">Evidencia y Firma</h5>
                  <div className="flex flex-col sm:flex-row gap-4">
                    {selectedReport.evidence_url && (
                      <a href={selectedReport.evidence_url} target="_blank" rel="noreferrer" className="flex-1 p-4 bg-[#f5f5f5] rounded-xl border border-black/5 flex flex-col items-center gap-2 hover:bg-black/5 transition-colors">
                        <ExternalLink size={20} className="text-black/40" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Ver Evidencia</span>
                      </a>
                    )}
                    {selectedReport.signature_url && (
                      <div className="flex-1 p-4 bg-[#f5f5f5] rounded-xl border border-black/5 flex flex-col items-center gap-2">
                        <img 
                          src={selectedReport.signature_url} 
                          alt="Firma del Cliente" 
                          className="max-h-20 object-contain"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Firma del Cliente</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="text-[10px] font-bold uppercase tracking-widest text-black/40">Descripción de Actividades</h5>
                <div className="p-4 md:p-6 bg-[#f5f5f5] rounded-2xl text-sm text-black/80 leading-relaxed">
                  {selectedReport.description}
                </div>
              </div>

              {selectedReport.type === 'instalacion' && reportItems.length > 0 && (
                <div className="space-y-4">
                  <h5 className="text-[10px] font-bold uppercase tracking-widest text-black/40">Equipos Instalados</h5>
                  <div className="bg-white border border-black/5 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead>
                          <tr className="bg-black/[0.02] border-b border-black/5">
                            <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-black/40">Equipo</th>
                            <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-black/40">Modelo</th>
                            <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-black/40">Serie</th>
                            <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-black/40">Cant</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5">
                          {reportItems.map((item, idx) => (
                            <tr key={idx}>
                              <td className="p-3 text-xs font-bold">{item.name}</td>
                              <td className="p-3 text-xs text-black/60">{item.model}</td>
                              <td className="p-3 text-xs text-black/60">{item.serial}</td>
                              <td className="p-3 text-xs font-bold">{item.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-12 border-2 border-dashed border-black/5 rounded-2xl text-black/20 font-medium">
              Selecciona un reporte para visualizar los detalles completos
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
