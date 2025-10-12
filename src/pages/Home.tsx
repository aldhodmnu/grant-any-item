import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/layout/BottomNav";
import { useCart } from "@/hooks/use-cart";
import { 
  Home as HomeIcon, 
  Package, 
  FileText, 
  Clock, 
  TrendingUp, 
  ShoppingCart,
  Building2,
  Users,
  ArrowRight,
  Bell
} from "lucide-react";

export default function Home() {
  const { totalItems } = useCart();
  const [stats, setStats] = useState({
    totalItems: 0,
    myRequests: 0,
    pendingApprovals: 0,
    activeLoans: 0,
    totalDepartments: 0,
  });
  interface UserProfile { full_name?: string; unit?: string; email?: string }
  interface ActivityItem { id: string; status: string; created_at: string; purpose: string; request_items?: { item?: { name?: string } }[] }
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [unreadApproved, setUnreadApproved] = useState(0);
  const [pendingOwner, setPendingOwner] = useState(0);
  const [pendingHeadmaster, setPendingHeadmaster] = useState(0);
  interface SimpleRequestCard { id: string; purpose: string; created_at: string; start_date?: string; end_date?: string; borrower?: { full_name?: string; unit?: string } }
  const [pendingOwnerList, setPendingOwnerList] = useState<SimpleRequestCard[]>([]);
  const [pendingHeadmasterList, setPendingHeadmasterList] = useState<SimpleRequestCard[]>([]);
  const [approvedNotActive, setApprovedNotActive] = useState<SimpleRequestCard[]>([]);
  const [activating, setActivating] = useState<string | null>(null);
  // Toggle untuk menampilkan grid statistik lama (diminta disembunyikan, tapi tidak dihapus dari kode)
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const loadAllData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) return;

        // Fetch user data
        const [profileResult, rolesResult] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).single(),
          supabase.from("user_roles").select("role").eq("user_id", user.id)
        ]);

        if (isMounted) {
          if (profileResult.data) setUserProfile({ ...profileResult.data, email: user.email });
          if (rolesResult.data) setUserRoles(rolesResult.data.map(r => r.role));
        }

        // Fetch stats
        const [itemsCount, requestsCount, activeCount, departmentsCount] = await Promise.all([
          supabase.from("items").select("*", { count: "exact", head: true }),
          supabase.from("borrow_requests").select("*", { count: "exact", head: true }).eq("borrower_id", user.id),
          supabase.from("borrow_requests").select("*", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("departments").select("*", { count: "exact", head: true })
        ]);

        if (isMounted) {
          setStats({
            totalItems: itemsCount.count || 0,
            myRequests: requestsCount.count || 0,
            pendingApprovals: 0,
            activeLoans: activeCount.count || 0,
            totalDepartments: departmentsCount.count || 0,
          });
        }

        // Fetch unread approved letters (surat sudah approved tapi belum dilihat)
        const { count: unreadApprovedCount } = await supabase
          .from('borrow_requests')
          .select('*', { count: 'exact', head: true })
          .eq('borrower_id', user.id)
          .eq('status', 'approved')
          .is('letter_viewed_at', null);

        if (isMounted) setUnreadApproved(unreadApprovedCount || 0);

        // Pending approvals untuk owner/headmaster
        let ownerPending = 0;
        let headmasterPending = 0;
        const roleSet = new Set((userRoles));
        if (roleSet.has('owner')) {
          const { count: ownerCount } = await supabase
            .from('borrow_requests')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending_owner');
          ownerPending = ownerCount || 0;
        }
        if (roleSet.has('headmaster')) {
          const { count: hmCount } = await supabase
            .from('borrow_requests')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending_headmaster');
          headmasterPending = hmCount || 0;
        }
        if (isMounted) {
          setPendingOwner(ownerPending);
          setPendingHeadmaster(headmasterPending);
        }

        // Fetch recent activity
          // Fetch list pending owner (ringkas, max 5)
          if (roleSet.has('owner')) {
            const { data: ownerPend } = await supabase
              .from('borrow_requests')
              .select(`id, purpose, created_at, borrower:profiles!borrow_requests_borrower_id_fkey(full_name, unit)`)
              .eq('status', 'pending_owner')
              .order('created_at', { ascending: true })
              .limit(5);
            if (isMounted) setPendingOwnerList(ownerPend || []);
          } else if (isMounted) setPendingOwnerList([]);

          // Fetch list pending headmaster
          if (roleSet.has('headmaster')) {
            const { data: hmPend } = await supabase
              .from('borrow_requests')
              .select(`id, purpose, created_at, borrower:profiles!borrow_requests_borrower_id_fkey(full_name, unit)`)
              .eq('status', 'pending_headmaster')
              .order('created_at', { ascending: true })
              .limit(5);
            if (isMounted) setPendingHeadmasterList(hmPend || []);
          } else if (isMounted) setPendingHeadmasterList([]);

          // Fetch approved belum active (borrower) → user bisa diminta mulai (owner aktifkan, tapi borrower lihat daftar menunggu aktivasi)
          const { data: apprNotActive } = await supabase
            .from('borrow_requests')
            .select(`id, purpose, created_at, start_date, end_date, borrower_id, borrower:profiles!borrow_requests_borrower_id_fkey(full_name, unit)`) 
            .eq('status', 'approved')
            .order('created_at', { ascending: true })
            .limit(5);
          if (isMounted) setApprovedNotActive(apprNotActive || []);

          // Fetch recent activity
        const { data: activityData } = await supabase
          .from("borrow_requests")
          .select(`
            id,
            status,
            created_at,
            purpose,
            request_items(item:items(name))
          `)
          .eq("borrower_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3);

        if (isMounted && activityData) {
          interface RawActivity { id: string; status: string; created_at: string; purpose: string; request_items?: { item?: { name?: string } }[] }
          const normalized: ActivityItem[] = (activityData as RawActivity[]).map(a => ({
            id: a.id,
            status: a.status,
            created_at: a.created_at,
            purpose: a.purpose,
            request_items: a.request_items?.map(ri => ({ item: { name: ri.item?.name } })) || []
          }));
          setRecentActivity(normalized);
        }
      } catch (error) {
        console.error("Error loading home data:", error);
      }
    };

    loadAllData();
    
    return () => {
      isMounted = false;
    };
  // Depend on userRoles karena kita hitung pending role-based; gunakan guard agar tidak loop
  }, [userRoles]);



  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Selamat Pagi";
    if (hour < 17) return "Selamat Siang";
    return "Selamat Sore";
  };

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      borrower: "Peminjam",
      owner: "Pemilik Alat",
      headmaster: "Kepala Sekolah",
      admin: "Administrator"
    };
    return roleMap[role] || role;
  };

  const quickActions = [
    {
      title: "Pilih Alat",
      description: "Browse alat by departemen",
      icon: Building2,
      link: "/departments",
      color: "text-primary",
      gradient: "from-primary/10 to-primary/5"
    },
    {
      title: "Keranjang",
      description: `${totalItems} alat dipilih`,
      icon: ShoppingCart,
      link: "/cart",
      color: "text-orange-600",
      gradient: "from-orange-100 to-orange-50",
      badge: totalItems > 0 ? totalItems : undefined
    },
    {
      title: "Pengajuan Saya",
      description: "Track status peminjaman",
      icon: FileText,
      link: "/orders",
      color: "text-blue-600",
      gradient: "from-blue-100 to-blue-50"
    },
    {
      title: "Aktivitas Real-time",
      description: "Lihat peminjaman aktif",
      icon: TrendingUp,
      link: "/realtime",
      color: "text-green-600",
      gradient: "from-green-100 to-green-50"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-20">
      {/* Enhanced Hero Section dengan Safe Area */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 safe-area-top">
        <div className="px-4 pt-6 pb-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="space-y-6">
            {/* Enhanced Greeting dengan lebih banyak breathing room */}
            <div className="flex items-center gap-4 mt-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center neu-raised">
                <span className="text-xl font-bold text-blue-700">
                  {userProfile?.full_name ? userProfile.full_name.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">{getGreeting()}!</h1>
                <p className="text-base sm:text-lg text-gray-600 mt-1 truncate">
                  {userProfile?.full_name || "User"}
                </p>
                {userProfile?.unit && (
                  <p className="text-sm text-gray-500 mt-1 truncate">{userProfile.unit}</p>
                )}
              </div>
              
              {/* Cart Button dengan styling yang lebih baik */}
              {totalItems > 0 && (
                <Link to="/cart">
                  <Button size="sm" className="relative bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-4 py-2 neu-flat transition-all">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Keranjang</span>
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 bg-red-500 text-white text-xs flex items-center justify-center">
                      {totalItems}
                    </Badge>
                  </Button>
                </Link>
              )}
            </div>

            {/* Enhanced Roles dengan margin yang lebih baik */}
            {userRoles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {userRoles.map((role) => (
                  <Badge key={role} variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 rounded-full px-3 py-1.5 text-xs font-medium">
                    {getRoleLabel(role)}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Content dengan spacing yang lebih baik */}
      <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        {/* Section Notifikasi Cepat */}
        <div className="space-y-6">
          {/* Pending Owner List */}
          {userRoles.includes('owner') && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-800 tracking-wide">Butuh Review (Owner)</h2>
                <Link to="/owner-inbox" className="text-xs text-primary hover:underline">Lihat Semua</Link>
              </div>
              {pendingOwnerList.length === 0 ? (
                <p className="text-xs text-muted-foreground">Tidak ada permintaan menunggu.</p>
              ) : (
                <div className="space-y-3">
                  {pendingOwnerList.map(r => (
                    <Card key={r.id} className="neu-flat border-0 hover:neu-raised transition-all">
                      <CardContent className="p-3 flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-600 font-semibold text-xs">
                          {r.borrower?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{r.purpose}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{r.borrower?.full_name} • {r.borrower?.unit || '-'}</p>
                        </div>
                        <Link to={`/request/${r.id}`} className="text-[10px] text-primary font-medium hover:underline">Detail</Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pending Headmaster List */}
          {userRoles.includes('headmaster') && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-800 tracking-wide">Butuh Tanda Tangan (Kepsek)</h2>
                <Link to="/headmaster-inbox" className="text-xs text-primary hover:underline">Lihat Semua</Link>
              </div>
              {pendingHeadmasterList.length === 0 ? (
                <p className="text-xs text-muted-foreground">Tidak ada permintaan menunggu.</p>
              ) : (
                <div className="space-y-3">
                  {pendingHeadmasterList.map(r => (
                    <Card key={r.id} className="neu-flat border-0 hover:neu-raised transition-all">
                      <CardContent className="p-3 flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-600/10 flex items-center justify-center text-indigo-600 font-semibold text-xs">
                          {r.borrower?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{r.purpose}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{r.borrower?.full_name} • {r.borrower?.unit || '-'}</p>
                        </div>
                        <Link to={`/request/${r.id}`} className="text-[10px] text-primary font-medium hover:underline">Detail</Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Approved Belum Active */}
          {approvedNotActive.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-800 tracking-wide">Menunggu Aktivasi Peminjaman</h2>
                <Link to="/orders" className="text-xs text-primary hover:underline">Lihat Semua</Link>
              </div>
              <div className="space-y-3">
                {approvedNotActive.map(r => (
                  <Card key={r.id} className="neu-flat border-0 hover:neu-raised transition-all">
                    <CardContent className="p-3 flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-green-600/10 flex items-center justify-center text-green-600 font-semibold text-xs">
                        {r.borrower?.full_name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{r.purpose}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">Periode: {new Date(r.start_date).toLocaleDateString('id-ID', { day:'2-digit', month:'short' })} - {new Date(r.end_date).toLocaleDateString('id-ID', { day:'2-digit', month:'short' })}</p>
                      </div>
                      {userRoles.includes('owner') ? (
                        <button
                          disabled={activating === r.id}
                          onClick={async () => {
                            try {
                              setActivating(r.id);
                              const { error } = await supabase
                                .from('borrow_requests')
                                .update({ status: 'active', activated_at: new Date().toISOString() })
                                .eq('id', r.id)
                                .eq('status', 'approved');
                              if (!error) {
                                setApprovedNotActive(prev => prev.filter(x => x.id !== r.id));
                              }
                            } finally {
                              setActivating(null);
                            }
                          }}
                          className="text-[10px] px-2 py-1 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                        >{activating === r.id ? 'Aktif...' : 'Mulai'}</button>
                      ) : (
                        <Link to={`/request/${r.id}`} className="text-[10px] text-primary font-medium hover:underline">Detail</Link>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Aksi Cepat tetap dipertahankan */}
        {/* Enhanced Stats Grid dengan gap yang lebih besar */}
          {(unreadApproved > 0 || pendingOwner > 0 || pendingHeadmaster > 0) && (
            <div className="space-y-3">
              {unreadApproved > 0 && (
                <Card className="border-0 shadow-sm bg-green-50/80 neu-flat">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-green-600 text-white flex items-center justify-center font-bold text-sm">{unreadApproved}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-green-800">Surat Disetujui</p>
                      <p className="text-xs text-green-700">{unreadApproved} pengajuan Anda sudah disetujui dan siap diunduh.</p>
                    </div>
                    <Link to="/orders"><Button size="sm" className="bg-green-600 hover:bg-green-700 text-white rounded-lg">Lihat</Button></Link>
                  </CardContent>
                </Card>
              )}
              {pendingOwner > 0 && userRoles.includes('owner') && (
                <Card className="border-0 shadow-sm bg-orange-50/80 neu-flat">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold text-sm">{pendingOwner}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-orange-800">Menunggu Review Owner</p>
                      <p className="text-xs text-orange-700">Ada {pendingOwner} permintaan butuh keputusan Anda.</p>
                    </div>
                    <Link to="/owner-inbox"><Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg">Review</Button></Link>
                  </CardContent>
                </Card>
              )}
              {pendingHeadmaster > 0 && userRoles.includes('headmaster') && (
                <Card className="border-0 shadow-sm bg-indigo-50/80 neu-flat">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">{pendingHeadmaster}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-indigo-800">Menunggu Persetujuan Kepsek</p>
                      <p className="text-xs text-indigo-700">Ada {pendingHeadmaster} permintaan menunggu tanda tangan.</p>
                    </div>
                    <Link to="/headmaster-inbox"><Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">Tinjau</Button></Link>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

        {/* Grid statistik lama — disembunyikan default, bisa ditampilkan manual lewat toggle */}
        {showStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 animate-in fade-in-50">
            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm neu-flat hover:neu-raised transition-all">
              <CardContent className="p-4 sm:p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3 neu-raised">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalItems}</div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium mt-1">Alat Tersedia</div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm neu-flat hover:neu-raised transition-all">
              <CardContent className="p-4 sm:p-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3 neu-raised">
                  <Building2 className="h-6 w-6 text-green-600" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalDepartments}</div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium mt-1">Departemen</div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm neu-flat hover:neu-raised transition-all">
              <CardContent className="p-4 sm:p-6 text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-3 neu-raised">
                  <FileText className="h-6 w-6 text-orange-600" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.myRequests}</div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium mt-1">Pengajuan Saya</div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm neu-flat hover:neu-raised transition-all">
              <CardContent className="p-4 sm:p-6 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-3 neu-raised">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.activeLoans}</div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium mt-1">Sedang Dipinjam</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tombol toggle tampil/sembunyi statistik */}
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => setShowStats(s => !s)}
            className="text-[11px] px-3 py-1 rounded-full bg-white/70 hover:bg-white shadow neu-flat transition-all border border-gray-200 text-gray-600"
          >{showStats ? 'Sembunyikan Statistik' : 'Tampilkan Statistik Ringkas'}</button>
        </div>

        {/* Quick Actions dengan spacing yang lebih baik */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-5 text-gray-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary shadow-inner" /> Aksi Cepat
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            {quickActions.map((action) => (
              <Link key={action.title} to={action.link}>
                <Card className="neu-flat hover:neu-raised transition-all h-full group relative overflow-hidden">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-white/0 via-white/30 to-white/60 pointer-events-none" />
                  <CardContent className="p-4 sm:p-5">
                    <div className="space-y-3">
                      <div className="relative">
                        <div className={`neu-raised w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${action.gradient} group-hover:scale-105 transition-transform shadow-inner`}> 
                          <action.icon className={`h-6 w-6 ${action.color}`} />
                        </div>
                        {action.badge && (
                          <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-[11px] bg-red-500 text-white shadow-lg">
                            {action.badge}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold text-sm text-gray-900 tracking-tight">{action.title}</h3>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{action.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity dengan spacing yang lebih baik */}
        {recentActivity.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Aktivitas Terbaru</h2>
              <Link to="/orders">
                <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10 rounded-lg">
                  Lihat Semua <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="space-y-4">
              {recentActivity.slice(0, 2).map((activity) => (
                <Card key={activity.id} className="neu-flat hover:neu-raised transition-all">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center gap-4">
                      <div className="neu-raised p-2.5 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-gray-900">
                          {activity.purpose}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.request_items?.length} alat • {activity.status}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs px-2 py-1 rounded-full">
                        {activity.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Inbox for Owners/Headmasters dengan styling yang diperbaiki */}
        {(userRoles.includes("owner") || userRoles.includes("headmaster")) && stats.pendingApprovals > 0 && (
          <Card className="neu-raised border-orange-200 bg-orange-50/50 mt-8">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-4">
                <div className="neu-raised p-3 rounded-xl bg-orange-100">
                  <Bell className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-orange-800">Perlu Review</h3>
                  <p className="text-sm text-orange-700 mt-1">
                    {stats.pendingApprovals} pengajuan menunggu persetujuan
                  </p>
                </div>
                <Link to={userRoles.includes("headmaster") ? "/headmaster-inbox" : "/owner-inbox"}>
                  <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg px-4 py-2">
                    Review
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
}