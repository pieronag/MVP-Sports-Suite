import os

file_path = r'c:\Users\Piero\Desktop\PROYECTOS 2026\MVP-Sports-Suite\mvp-sports-web\app\dashboard\championships\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = 0
for i, line in enumerate(lines):
    if skip > 0:
        skip -= 1
        continue
    
    # 1. Update Grid to 4 columns (already done partially but ensuring all are 4)
    if 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' in line:
        new_lines.append(line.replace('lg:grid-cols-3 gap-6', 'lg:grid-cols-3 xl:grid-cols-4 gap-4'))
        continue

    # 2. Identify the start of the card inside the management modal
    # Looking for: <div key={mIdx} className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all group relative">
    if '{mIdx} className="bg-white' in line and 'rounded-[2rem]' in line and 'hover:scale-[1.02]' in line:
        indent = line[:line.find('<div')]
        card_content = """{indent}<div key={mIdx} className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[1.5rem] overflow-hidden shadow-sm hover:shadow-lg transition-all group relative">
{indent}    <div className="bg-slate-50 dark:bg-white/5 px-4 py-2 border-b border-slate-100 dark:border-white/10 flex justify-between items-center">
{indent}        <span className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">Partido #{originalIdx + 1}</span>
{indent}        <div className="flex items-center gap-1.5">
{indent}            <span className={`text-[7px] font-black px-2 py-0.5 rounded-full uppercase ${match.status === 'finished' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500 animate-pulse'}`}>
{indent}                {match.period === 'FIN' ? 'Finalizado' : match.period || (match.status === 'finished' ? 'Finalizado' : 'Pendiente')}
{indent}            </span>
{indent}        </div>
{indent}    </div>
{indent}    <div className="p-5 space-y-4">
{indent}        <div className="space-y-3">
{indent}            <div className="flex justify-between items-center">
{indent}                <div className="flex flex-col flex-1 min-w-0">
{indent}                    <span className="text-[8px] font-black text-slate-400 uppercase">Local</span>
{indent}                    <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase truncate">{match.team1_name}</span>
{indent}                </div>
{indent}                <div className="text-xl font-black text-blue-600 pl-2">{match.score1 || 0}</div>
{indent}            </div>
{indent}            <div className="flex justify-between items-center">
{indent}                <div className="flex flex-col flex-1 min-w-0">
{indent}                    <span className="text-[8px] font-black text-slate-400 uppercase">Visitante</span>
{indent}                    <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase truncate">{match.team2_name}</span>
{indent}                </div>
{indent}                <div className="text-xl font-black text-blue-600 pl-2">{match.score2 || 0}</div>
{indent}            </div>
{indent}        </div>
{indent}        <div className="flex flex-col gap-2 pt-2">
{indent}            <button 
{indent}                onClick={() => {
{indent}                    const stats: any = {};
{indent}                    const m = match;
{indent}                    const t1 = manageTeams.tournament.teams.find((t: any) => t.name === m.team1_name);
{indent}                    const t2 = manageTeams.tournament.teams.find((t: any) => t.name === m.team2_name);
{indent}                    const allPlayers = [...(t1?.players || []), ...(t2?.players || [])];
{indent}                    allPlayers.forEach(p => {
{indent}                        stats[p.name] = {
{indent}                            goals: m.stats?.scorers?.find((s: any) => s.playerName === p.name)?.goals || 0,
{indent}                            assists: m.stats?.assistants?.find((s: any) => s.playerName === p.name)?.count || 0,
{indent}                            yellowCards: m.stats?.yellowCards?.filter((n: string) => n === p.name).length || 0,
{indent}                            redCards: m.stats?.redCards?.filter((n: string) => n === p.name).length || 0
{indent}                        };
{indent}                    });
{indent}                    setMatchResult({ 
{indent}                        isOpen: true, 
{indent}                        tournament: manageTeams.tournament, 
{indent}                        matchIdx: originalIdx, 
{indent}                        playerStats: stats
{indent}                    });
{indent}                }}
{indent}                className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase transition-all flex items-center justify-center gap-2 ${match.status === 'finished' ? 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200' : 'bg-slate-900 dark:bg-white dark:text-slate-900 text-white shadow-lg shadow-blue-500/10 hover:scale-[1.02]'}`}
{indent}            >
{indent}                {match.status === 'finished' ? <PencilIcon className="w-3.5 h-3.5" /> : <PencilSquareIcon className="w-3.5 h-3.5" />}
{indent}                {match.status === 'finished' ? 'Editar resultados' : 'Gestionar Stats'}
{indent}            </button>
{indent}            {match.status === 'finished' && (
{indent}                <button 
{indent}                    onClick={() => setMatchSummary({ isOpen: true, match })}
{indent}                    className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
{indent}                >
{indent}                    <DocumentTextIcon className="w-3.5 h-3.5" /> Resumen
{indent}                </button>
{indent}            )}
{indent}        </div>
{indent}    </div>
{indent}</div>""".replace('{indent}', indent)
        new_lines.append(card_content + "\n")
        # Find how many lines to skip
        s = 0
        while i + s < len(lines) and '</div>' not in lines[i+s+1]:
            s += 1
        # The card block ends after several </div>s. 
        # In the original it was about 15 lines.
        # Line 1665 to 1722 is 57 lines.
        skip = 57 
    else:
        new_lines.append(line)

final_content = "".join(new_lines)

# 3. Add Modal (if not present)
if 'matchSummary.isOpen' not in final_content:
    modal_code = """
            {/* MODAL DE RESUMEN DE PARTIDO */}
            {matchSummary.isOpen && matchSummary.match && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-white/10 overflow-hidden relative flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                    <DocumentTextIcon className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none">
                                        Resumen del Encuentro
                                    </h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Detalles oficiales del partido</p>
                                </div>
                            </div>
                            <button onClick={() => setMatchSummary({ isOpen: false, match: null })} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                                <XMarkIcon className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="space-y-10">
                                {/* Scoreboard */}
                                <div className="flex justify-center items-center gap-12 py-8 bg-slate-50 dark:bg-white/[0.02] rounded-[2.5rem] border border-slate-100 dark:border-white/5">
                                    <div className="text-right flex-1">
                                        <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white mb-1">{matchSummary.match.team1_name}</h4>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Local</span>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-5xl font-black text-blue-600 tabular-nums">{matchSummary.match.score1 || 0}</div>
                                        <div className="text-2xl font-black text-slate-200 dark:text-white/10">:</div>
                                        <div className="text-5xl font-black text-blue-600 tabular-nums">{matchSummary.match.score2 || 0}</div>
                                    </div>
                                    <div className="text-left flex-1">
                                        <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white mb-1">{matchSummary.match.team2_name}</h4>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Visitante</span>
                                    </div>
                                </div>
                                {/* Stats Sections */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Goleadores */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-6 h-6 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                                                <SparklesIcon className="w-3.5 h-3.5 text-emerald-500" />
                                            </div>
                                            <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Goleadores</h5>
                                        </div>
                                        <div className="space-y-2">
                                            {matchSummary.match.stats?.scorers?.map((s: any, idx: number) => (
                                                <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">{s.playerName}</span>
                                                    <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">x{s.goals}</span>
                                                </div>
                                            ))}
                                            {(!matchSummary.match.stats?.scorers || matchSummary.match.stats.scorers.length === 0) && (
                                                <p className="text-[9px] text-slate-400 font-bold uppercase italic">Sin goles registrados</p>
                                            )}
                                        </div>
                                    </div>
                                    {/* Tarjetas */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-6 h-6 bg-amber-500/10 rounded-lg flex items-center justify-center">
                                                <IdentificationIcon className="w-3.5 h-3.5 text-amber-500" />
                                            </div>
                                            <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Amonestaciones</h5>
                                        </div>
                                        <div className="space-y-2">
                                            {matchSummary.match.stats?.yellowCards?.map((name: string, idx: number) => (
                                                <div key={`y-${idx}`} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                                                    <div className="w-3 h-4 bg-amber-400 rounded-sm shadow-sm" />
                                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">{name}</span>
                                                </div>
                                            ))}
                                            {matchSummary.match.stats?.redCards?.map((name: string, idx: number) => (
                                                <div key={`r-${idx}`} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                                                    <div className="w-3 h-4 bg-red-500 rounded-sm shadow-sm" />
                                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">{name}</span>
                                                </div>
                                            ))}
                                            {(!matchSummary.match.stats?.yellowCards?.length && !matchSummary.match.stats?.redCards?.length) && (
                                                <p className="text-[9px] text-slate-400 font-bold uppercase italic">Limpio - Sin tarjetas</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {/* MVP Section */}
                                <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] shadow-xl shadow-blue-500/20 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                                        <TrophyIcon className="w-32 h-32 text-white" />
                                    </div>
                                    <div className="relative z-10 flex flex-col items-center text-center">
                                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-3">
                                            <StarIcon className="w-6 h-6 text-amber-400 fill-amber-400" />
                                        </div>
                                        <h5 className="text-[10px] font-black uppercase text-blue-100 tracking-[0.3em] mb-1">MVP del Partido</h5>
                                        <p className="text-xl font-black text-white uppercase italic">{matchSummary.match.stats?.mvp || 'No asignado'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
    """
    final_content = final_content.replace('{/* CONFIRMACIÓN ELIMINAR */}', modal_code + '\n            {/* CONFIRMACIÓN ELIMINAR */}')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(final_content)

print("File updated successfully.")
