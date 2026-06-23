import { Button } from "./ui/button";
import { XCircle } from "lucide-react";

function WarningDialog(props: {dialogMessage: string, setShowDialog: (show: boolean) => void, setDialogMessage: (message: string) => void}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 text-red-500">
                            <XCircle className="h-6 w-6 shrink-0" />
                            <h3 className="text-lg font-bold text-foreground">Duplicate Job Link</h3>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap break-all">
                            {props.dialogMessage}
                        </p>
                        <div className="flex justify-end pt-2">
                            <Button
                                onClick={() => {
                                    props.setShowDialog(false)
                                    props.setDialogMessage('')
                                }}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm"
                            >
                                Dismiss
                            </Button>
                        </div>
                    </div>
                </div>
  )
}

export default WarningDialog