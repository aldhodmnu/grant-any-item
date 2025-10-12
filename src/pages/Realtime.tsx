import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/layout/BottomNav";
import { Calendar, Package, User, Clock, Activity, Eye, X, Home as HomeIcon, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { id } from "date-fns/locale";
interface BorrowerProfile {
  id?: string; // Bisa tidak dikembalikan oleh select saat tidak diminta
  full_name?: string;
  unit?: string;
}

interface ItemEntity {
  id?: string; // Bisa tidak ikut di-select
  name?: string;
  department?: { name?: string };
}

interface RequestItemEntity {
  id: string;
  quantity: number;
  item?: ItemEntity;
}

interface LoanEntity {
  id: string;
  end_date: string;
  start_date?: string;
  purpose?: string;
  borrower?: BorrowerProfile;
  request_items?: RequestItemEntity[];
  status?: string;
  created_at?: string;
  location_usage?: string;
  department_names?: string[]; // agregasi departemen item
  letter_number?: string;
}

// Tipe mentah hasil Supabase (subset yang dipakai saja)
interface RawRequestItem {
  id: string;
  quantity: number;
  item?: { name?: string; department?: { name?: string } };
}
interface RawBorrowRequest {
  id: string;
  end_date: string;
  start_date?: string;
  purpose?: string;
  borrower?: BorrowerProfile;
  request_items?: RawRequestItem[];
  status?: string;
  created_at?: string;
  location_usage?: string;
  letter_number?: string;
}

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export default function Realtime() {
  const [activeLoans, setActiveLoans] = useState<LoanEntity[]>([]);
  const [recentActivities, setRecentActivities] = useState<LoanEntity[]>([]);
  const [stats, setStats] = useState({
    totalActive: 0,
    totalToday: 0,
    mostBorrowed: "-"
  });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<LoanEntity | null>(null);

  useEffect(() => {
    fetchData();

    // Realtime subscription
    const channel = supabase
      .channel("realtime-activities")
      .on("postgres_changes", 
        { event: "*", schema: "public", table: "borrow_requests" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Active loans
      const { data: activeData } = await supabase
        .from("borrow_requests")
        .select(`
          *,
          request_items(*, item:items(name, department:departments(name))),
          borrower:profiles!borrow_requests_borrower_id_fkey(full_name, unit)
        `)
        .eq("status", "active")
        .order("started_at", { ascending: false });

      // Recent activities (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { data: recentData } = await supabase
        .from("borrow_requests")
        .select(`
          *,
          request_items(*, item:items(name, department:departments(name))),
          borrower:profiles!borrow_requests_borrower_id_fkey(full_name, unit)
        `)
        .gte("created_at", yesterday.toISOString())
        .order("created_at", { ascending: false })
        .limit(10);

      // Today's requests
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count: todayCount } = await supabase
        .from("borrow_requests")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString());

      const adaptLoan = (raw: RawBorrowRequest): LoanEntity => {
        // Ambil daftar nama item lalu derive department placeholder (jika nanti mau ditambahkan relasi real)
        // Sementara departemen diambil dari pola nama item (fallback '-')
        const department_names: string[] = [];
        raw.request_items?.forEach((ri: RawRequestItem) => {
          const dn = ri.item?.department?.name;
          if (dn && !department_names.includes(dn)) department_names.push(dn);
        });
        return {
          id: raw.id,
          end_date: raw.end_date,
            start_date: raw.start_date,
          purpose: raw.purpose,
          borrower: raw.borrower,
          request_items: raw.request_items?.map((ri: RawRequestItem) => ({
            id: ri.id,
            quantity: ri.quantity,
            item: { name: ri.item?.name }
          })),
          status: raw.status,
          created_at: raw.created_at,
          location_usage: raw.location_usage,
          department_names,
          letter_number: raw.letter_number
        };
      };

      if (activeData) setActiveLoans(activeData.map(adaptLoan));
      if (recentData) setRecentActivities(recentData.map(adaptLoan));
      // Hitung item/alat paling sering muncul (sederhana) dari activeData
      const freqMap = new Map<string, number>();
  activeData?.forEach((req: RawBorrowRequest) => {
        req.request_items?.forEach((ri: RequestItemEntity) => {
          const key = ri.item?.name || 'Alat';
          freqMap.set(key, (freqMap.get(key) || 0) + ri.quantity);
        });
      });
      const mostBorrowed = [...freqMap.entries()].sort((a,b) => b[1]-a[1])[0]?.[0] || '-';

      setStats({
        totalActive: activeData?.length || 0,
        totalToday: todayCount || 0,
        mostBorrowed
      });
    } catch (error) {
      console.error("Error fetching realtime data:", error);
    }
    finally { setLoading(false); }
  };

  const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { label: string; variant: BadgeVariant; color: string }> = {
      active: { label: "Sedang Dipinjam", variant: "default", color: "bg-green-100 text-green-700" },
      pending_owner: { label: "Menunggu Review", variant: "secondary", color: "bg-blue-100 text-blue-700" },
      pending_headmaster: { label: "Menunggu Surat", variant: "secondary", color: "bg-orange-100 text-orange-700" },
      approved: { label: "Disetujui", variant: "default", color: "bg-purple-100 text-purple-700" },
      completed: { label: "Selesai", variant: "outline", color: "bg-gray-100 text-gray-700" },
    };

    const statusInfo = statusMap[status] || { label: status, variant: "secondary", color: "bg-gray-100 text-gray-700" };
    return (
      <Badge variant={statusInfo.variant} className={statusInfo.color}>
        {statusInfo.label}
      </Badge>
    );
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Baru saja";
    if (diffInMinutes < 60) return `${diffInMinutes} menit lalu`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} jam lalu`;
    return format(date, "dd MMM, HH:mm", { locale: id });
  };

  // Layout baru: dua kolom di desktop
  return (
  <div className="min-h-screen pb-10 relative text-[15px] md:text-[16px] leading-relaxed bg-gray-50">
      {/* Background image + overlay - Fixed z-index */}
      <div className="fixed inset-0 -z-20">
        <div className="absolute inset-0 realtime-local-bg" />
        <div className="absolute inset-0 backdrop-blur-lg bg-green-900/60" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-green-50/40 to-white/50" />
      </div>
      {/* Watermark / Brand subtle (dipertahankan namun sedikit lebih lembut) */}
      <div className="pointer-events-none select-none opacity-[0.05] absolute inset-0 flex items-center justify-center text-[8vw] font-black tracking-tight text-green-800">
        DARUL MA'ARIF
      </div>
      {/* Header Kecil Kiri Atas */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-white/90 border-b border-green-200/60 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 relative">
          <div className="h-10 w-10 rounded-xl bg-green-800 flex items-center justify-center shadow-inner text-white font-bold text-sm">
            DA
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-green-800 leading-snug tracking-tight">
              Peminjaman Alat Darul Ma'arif
            </h1>
            <p className="text-sm text-green-700/80 truncate">
              Monitor real-time pergerakan peminjaman & aktivitas terbaru
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex gap-2 text-xs">
              <div className="px-3 py-1 rounded-full bg-green-100 text-green-800 font-medium shadow-sm">
                Aktif: {stats.totalActive}
              </div>
              <div className="px-3 py-1 rounded-full bg-white/80 text-green-700 font-medium shadow-sm">
                Hari Ini: {stats.totalToday}
              </div>
            </div>
            <Link to="/" className="h-10 w-10 rounded-xl bg-white hover:bg-green-50 text-green-800 flex items-center justify-center shadow neu-flat transition" aria-label="Kembali ke beranda">
              <HomeIcon className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 md:py-6 grid gap-6 md:gap-8 md:grid-cols-[1fr_320px] lg:grid-cols-[1fr_360px] relative">
        {/* Kolom Utama: Daftar Peminjaman Aktif */}
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-green-800">
              <Package className="h-5 w-5" /> Sedang Dipinjam
              <span className="text-xs font-medium bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                {activeLoans.length}
              </span>
            </h2>
            <div className="flex items-center gap-2 text-[11px]">
              {loading && <span className="text-xs text-green-600 animate-pulse">Memuat...</span>}
              <button onClick={fetchData} className="px-3 py-1.5 rounded-lg bg-white/80 hover:bg-white text-green-800 border border-green-200 text-[11px] font-medium shadow-sm active:scale-95 transition">
                Refresh
              </button>
            </div>
          </div>

          {activeLoans.length === 0 && !loading && (
            <Card className="border border-dashed border-green-200 bg-white/80">
              <CardContent className="py-10 text-center">
                <Package className="h-10 w-10 mx-auto mb-3 text-green-400" />
                <p className="text-sm text-green-700">Belum ada peminjaman aktif</p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {activeLoans.map((loan) => {
              const itemsShown = loan.request_items?.slice(0, 3) || [];
              const remaining = (loan.request_items?.length || 0) - itemsShown.length;
              return (
                <article key={loan.id} className="group relative rounded-2xl bg-white/90 backdrop-blur-lg border border-green-200/70 shadow-sm hover:shadow-lg transition-all overflow-hidden">
                  <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-green-500 to-green-700" />
                  <div className="p-4 sm:p-5 pl-5 sm:pl-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-green-50 flex items-center justify-center shadow-inner">
                          <User className="h-6 w-6 text-green-700" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-base sm:text-lg text-gray-900 leading-snug">
                            {loan.borrower?.full_name}
                          </h3>
                          <p className="text-sm text-green-700 font-medium mt-0.5">
                            {loan.borrower?.unit}
                          </p>
                          {loan.purpose && (
                            <p className="text-xs mt-1 text-gray-600 line-clamp-1">
                              <span className="font-medium text-green-700">Keperluan:</span> {loan.purpose}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                            {loan.location_usage && (
                              <p className="text-[11px] text-green-600 flex items-center gap-1"><MapPin className="h-3 w-3" /> {loan.location_usage}</p>
                            )}
                            {loan.department_names && loan.department_names.length > 0 && (
                              <p className="text-[11px] text-green-600">Dept: {loan.department_names.join(', ')}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <div className="flex items-center justify-end gap-1 text-xs text-gray-500">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">Selesai {format(new Date(loan.end_date), 'dd MMM', { locale: id })}</span>
                        </div>
                        <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-100 text-green-800 text-[11px] font-semibold tracking-wide uppercase shadow-sm">
                          Aktif
                        </div>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-[11px] text-green-700 hover:text-green-800 font-medium px-2 py-1 rounded-md bg-white/60 hover:bg-white border border-green-200"
                          onClick={() => setSelected(loan)}
                          aria-label={`Lihat detail peminjaman ${loan.borrower?.full_name}`}
                        >
                          <Eye className="h-3 w-3" /> Detail
                        </button>
                      </div>
                    </div>
                    {/* Items */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {itemsShown.map((ri: RequestItemEntity) => (
                        <span key={ri.id} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 border border-green-100 text-xs text-green-800">
                          <span className="font-mono font-semibold text-sm">{ri.quantity}x</span>
                          <span className="truncate max-w-[150px] font-medium">{ri.item?.name}</span>
                        </span>
                      ))}
                      {remaining > 0 && (
                        <span className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-green-50 border border-dashed border-green-200 text-xs text-green-700">
                          +{remaining} lainnya
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Stats kecil + Aktivitas Terbaru */}
        <div className="space-y-5 md:sticky md:top-20 h-fit">
          {/* Stats Mini */}
          <Card className="bg-white/85 backdrop-blur-md border border-green-200/70 shadow-sm">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 text-green-700">
                <Activity className="h-5 w-5" />
                <h3 className="font-semibold text-base">Statistik Singkat</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-sm text-gray-500 font-medium">Aktif</div>
                  <div className="mt-1 text-base font-bold text-green-700">{stats.totalActive}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500 font-medium">Hari Ini</div>
                  <div className="mt-1 text-base font-bold text-green-700">{stats.totalToday}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500 font-medium">Top</div>
                  <div className="mt-1 text-xs sm:text-sm font-semibold text-green-700 line-clamp-1">{stats.mostBorrowed}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aktivitas Terbaru Mini */}
            <Card className="bg-white/85 backdrop-blur-md border border-green-200/70 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-base text-green-700 flex items-center gap-2">
                    <Clock className="h-5 w-5" /> Terbaru
                  </h3>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-green-50 text-green-600 font-medium">
                    {recentActivities.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {recentActivities.length === 0 && !loading && (
                    <p className="text-sm text-gray-500 text-center py-4">Tidak ada aktivitas</p>
                  )}
                  {recentActivities.slice(0,6).map(act => (
                    <div key={act.id} className="flex items-start gap-2">
                      <div className="h-9 w-9 rounded-xl bg-green-50 flex items-center justify-center text-green-600 text-sm font-bold">
                        { (act.borrower?.full_name || '?').substring(0,2).toUpperCase() }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-800 truncate">
                          {act.borrower?.full_name}
                        </p>
                        <p className="text-[11px] text-green-600/70 truncate">
                          {act.request_items?.length} alat • {getTimeAgo(act.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
        </div>
      </div>
      {/* Modal Detail */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-green-900/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-full sm:max-w-lg bg-white/95 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-green-200/70 animate-in slide-in-from-bottom-8 sm:zoom-in-90">
            <div className="absolute top-3 right-3">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="h-8 w-8 rounded-full flex items-center justify-center bg-green-50 hover:bg-green-100 text-green-800 shadow-sm"
                aria-label="Tutup detail"
                title="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 pt-10 space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-green-800 leading-snug">Detail Peminjaman</h3>
                <p className="text-[13px] text-green-700 mt-1">Informasi ringkas peminjaman aktif</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-[13px]">
                <div>
                  <p className="text-xs text-green-700 font-medium uppercase tracking-wide">Peminjam</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{selected.borrower?.full_name}</p>
                  <p className="text-[11px] text-green-600">{selected.borrower?.unit}</p>
                </div>
                <div>
                  <p className="text-xs text-green-700 font-medium uppercase tracking-wide">Periode</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{selected.start_date ? format(new Date(selected.start_date), 'dd MMM', { locale: id }) : '?' } - {format(new Date(selected.end_date), 'dd MMM', { locale: id })}</p>
                  <p className="text-[11px] text-green-600">Selesai {format(new Date(selected.end_date), 'dd MMM yyyy', { locale: id })}</p>
                </div>
                {selected.department_names && selected.department_names.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-xs text-green-700 font-medium uppercase tracking-wide">Departemen Asal Alat</p>
                    <p className="font-medium text-gray-800 mt-0.5">{selected.department_names.join(', ')}</p>
                  </div>
                )}
                {selected.purpose && (
                  <div className="col-span-2">
                    <p className="text-xs text-green-700 font-medium uppercase tracking-wide">Keperluan</p>
                    <p className="font-medium text-gray-800 mt-0.5 leading-snug">{selected.purpose}</p>
                  </div>
                )}
                {selected.location_usage && (
                  <div className="col-span-2">
                    <p className="text-xs text-green-700 font-medium uppercase tracking-wide">Lokasi Penggunaan</p>
                    <p className="font-medium text-gray-800 mt-0.5">{selected.location_usage}</p>
                  </div>
                )}
                {selected.letter_number && (
                  <div className="col-span-2">
                    <p className="text-xs text-green-700 font-medium uppercase tracking-wide">Nomor Surat</p>
                    <p className="font-semibold text-green-800 mt-0.5">{selected.letter_number}</p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs text-green-700 font-medium uppercase tracking-wide">Daftar Alat</p>
                <div className="max-h-40 overflow-auto pr-1 space-y-2">
                  {selected.request_items?.map(ri => (
                    <div key={ri.id} className="flex items-center justify-between gap-4 rounded-lg bg-green-50 border border-green-100 px-3 py-2 text-[13px]">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">{ri.item?.name}</p>
                        <p className="text-[11px] text-green-600">Qty: {ri.quantity}</p>
                      </div>
                      <span className="inline-flex items-center justify-center rounded-md bg-white px-2 py-1 border border-green-200 text-[11px] font-semibold text-green-800 shadow-sm">
                        {ri.quantity}x
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <button onClick={() => setSelected(null)} className="flex-1 px-4 py-2 rounded-xl bg-green-50 hover:bg-green-100 text-green-800 font-medium text-sm shadow-sm">Tutup</button>
                <a href={`/public/request/${selected.id}`} className="flex-1 px-4 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white font-semibold text-sm shadow" target="_blank" rel="noopener noreferrer">
                  Lihat Detail / Surat
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}