import { useNavigate, useLocation } from "react-router-dom";
import { Home, Building2, ShoppingCart, FileText, User, Package } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { useUserRole } from "@/hooks/useUserRole";

// Routes where bottom nav should be hidden (public routes, auth, etc.)
const HIDDEN_ROUTES = ['/landing', '/auth', '/verify', '/realtime', '/public'];

const shouldShowBottomNav = (pathname: string) => {
  return !HIDDEN_ROUTES.some(route => pathname.startsWith(route));
};

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getTotalItems } = useCart();
  const { roles, loading: rolesLoading } = useUserRole();
  const userRoles = roles.map(r => r.role);
  const [unreadLetters, setUnreadLetters] = useState(0);

  // Catat agar struktur tab stabil: selalu render slot Manage (disabling interaksi saat belum punya role)

  useEffect(() => {
    const fetchUnreadLetters = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Check for approved requests that borrower hasn't seen yet
      const { count } = await supabase
        .from("borrow_requests")
        .select("*", { count: "exact", head: true })
        .eq("borrower_id", session.user.id)
        .eq("status", "approved")
        .is("letter_viewed_at", null);

      setUnreadLetters(count || 0);
    };

    fetchUnreadLetters();

    // Setup realtime subscription for new approved letters
    const channel = supabase
      .channel('approved-letters')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'borrow_requests',
          filter: 'status=eq.approved'
        },
        () => {
          fetchUnreadLetters();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const totalItems = getTotalItems();
  const isOwnerOrAdmin = userRoles.includes("owner") || userRoles.includes("admin");

  const tabs = useMemo(() => {
    const canManage = isOwnerOrAdmin;
    const base = [
      { id: 'home', label: 'Home', icon: Home, path: '/', badge: null },
      { id: 'departments', label: 'Departments', icon: Building2, path: '/departments', badge: null },
      { id: 'cart', label: 'Cart', icon: ShoppingCart, path: '/cart', badge: totalItems > 0 ? totalItems : null },
    ];
    // SELALU render slot 'Kelola' untuk stabilitas layout; disable jika tidak punya role
    const manage = [
      { id: 'manage', label: 'Kelola', icon: Package, path: '/manage-inventory', badge: null, disabled: !canManage }
    ];
    const tail = [
      { id: 'orders', label: 'Orders', icon: FileText, path: '/orders', badge: unreadLetters > 0 ? unreadLetters : null },
      { id: 'profile', label: 'Profile', icon: User, path: '/profile', badge: null }
    ];
    return [...base, ...manage, ...tail];
  }, [totalItems, unreadLetters, isOwnerOrAdmin]);

  // Hide on public routes
  if (!shouldShowBottomNav(location.pathname)) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom transition-transform duration-300 ease-out">
      {/* Modern floating glass container */}
      <div className="mx-4 mb-4">
        <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl shadow-black/10 neu-raised-heavy overflow-hidden">
          {/* Subtle gradient overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-50/30 to-white/30 pointer-events-none" />
          
          {/* Navigation items */}
          <div className="relative flex justify-around items-center py-3 px-2">
            {tabs.map((tab) => {
              const isTabActive = isActive(tab.path);
              const Icon = tab.icon;
              
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      // Prevent navigation when disabled
                      // @ts-ignore - optional property
                      if ((tab as any).disabled) return;
                      navigate(tab.path);
                    }}
                    // @ts-ignore - optional property
                    disabled={(tab as any).disabled}
                    aria-disabled={Boolean((tab as any).disabled)}
                    className={`relative flex flex-col items-center justify-center min-w-0 flex-1 py-2 px-1 group transition-all duration-300 ${
                      // @ts-ignore
                      (tab as any).disabled ? 'opacity-60 pointer-events-none' : ''
                    }`}
                  >
                    {/* Active indicator background */}
                    {/* Do not show active state for disabled tabs */}
                    {isTabActive && !(tab as any).disabled && (
                      <div className="absolute inset-0 bg-primary/10 rounded-xl neu-inset animate-in fade-in-50 zoom-in-95" />
                    )}
                    
                    {/* Icon container with neu effect */}
                    <div className={`relative p-2 rounded-xl transition-all duration-300 group-active:scale-95 ${
                      isTabActive && !(tab as any).disabled
                        ? "neu-raised bg-white shadow-inner"
                        : "group-hover:neu-flat group-hover:bg-white/50"
                    }`}>
                      <Icon className={`h-5 w-5 transition-colors duration-300 ${
                        isTabActive && !(tab as any).disabled
                          ? "text-primary"
                          : "text-gray-500 group-hover:text-gray-700"
                      }`} />
                      
                      {/* Badge with neu styling */}
                      {tab.badge && (
                        <div className="absolute -top-1 -right-1 bg-gradient-to-br from-red-500 to-red-600 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-lg neu-raised border border-white/30">
                          {tab.badge > 99 ? '99+' : tab.badge}
                        </div>
                      )}
                    </div>
                    
                    {/* Label with better typography */}
                    <span className={`text-[10px] mt-1 font-semibold tracking-tight transition-colors duration-300 ${
                      isTabActive && !(tab as any).disabled
                        ? "text-primary"
                        : "text-gray-500 group-hover:text-gray-700"
                    }`}>
                      {tab.label}
                    </span>
                    
                    {/* Active dot indicator */}
                    {isTabActive && !(tab as any).disabled && (
                      <div className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full shadow-sm animate-in fade-in-50 slide-in-from-bottom-2" />
                    )}
                  </button>
                );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
