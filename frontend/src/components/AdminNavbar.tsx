import { Button } from './ui/button'
import { Terminal, Sun, Moon, LogOut } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useDispatch, useSelector } from 'react-redux'
import { clearUser } from '@/redux/reducers/auth-reducer'
import { logoutUser } from '@/api'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import type { RootState } from '@/redux/reducers'

function AdminNavbar() {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { userData } = useSelector((state: RootState) => state.auth)

    const { setTheme, resolvedTheme } = useTheme()
    const toggleTheme = () => {
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
    }

    const logoutMutation = useMutation({
        mutationFn: logoutUser,
        onSuccess: () => {
            dispatch(clearUser())
            navigate('/login')
        },
    })

    return (
        <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-indigo-600/10 p-2 text-indigo-400 border border-indigo-500/20">
                                <Terminal className="h-6 w-6" />
                            </div>
                            <span className="text-xl font-bold tracking-tight text-foreground">
                                Job Shortcut
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <Button
                                onClick={toggleTheme}
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-lg border border-border text-foreground hover:bg-secondary cursor-pointer transition-all"
                                aria-label="Toggle Theme"
                            >
                                {resolvedTheme === 'dark' ? (
                                    <Sun className="h-4 w-4 text-yellow-500" />
                                ) : (
                                    <Moon className="h-4 w-4 text-indigo-600" />
                                )}
                            </Button>
                            <div className="hidden md:flex flex-col text-right">
                                <span className="text-sm font-semibold text-foreground">{userData.name || 'Admin'}</span>
                                <span className="text-xs text-muted-foreground">{userData.email}</span>
                            </div>
                            <Button
                                onClick={() => logoutMutation.mutate()}
                                disabled={logoutMutation.isPending}
                                variant="destructive"
                                className="cursor-pointer font-medium transition-all gap-2"
                            >
                                <LogOut className="h-4 w-4" />
                                {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
                            </Button>
                        </div>
                    </div>
                </div>
            </header>
  )
}

export default AdminNavbar