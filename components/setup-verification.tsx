"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { fetchMarketStatus } from "@/lib/polygon"
import { useToast } from "@/hooks/use-toast"

interface ConnectionStatus {
  supabase: "checking" | "connected" | "error"
  polygon: "checking" | "connected" | "error"
  database: "checking" | "ready" | "needs-setup" | "error"
}

export function SetupVerification() {
  const [status, setStatus] = useState<ConnectionStatus>({
    supabase: "checking",
    polygon: "checking",
    database: "checking",
  })
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    checkConnections()
  }, [])

  const checkConnections = async () => {
    setIsRefreshing(true)

    // Check Supabase connection
    try {
      const { data, error } = await supabase.from("funds").select("count").limit(1)
      if (error) {
        if (error.message.includes('relation "funds" does not exist')) {
          setStatus((prev) => ({ ...prev, supabase: "connected", database: "needs-setup" }))
        } else {
          setStatus((prev) => ({ ...prev, supabase: "error", database: "error" }))
        }
      } else {
        setStatus((prev) => ({ ...prev, supabase: "connected", database: "ready" }))
      }
    } catch (error) {
      setStatus((prev) => ({ ...prev, supabase: "error", database: "error" }))
    }

    // Check Polygon.io connection
    try {
      const marketStatus = await fetchMarketStatus()
      if (marketStatus) {
        setStatus((prev) => ({ ...prev, polygon: "connected" }))
      } else {
        setStatus((prev) => ({ ...prev, polygon: "error" }))
      }
    } catch (error) {
      setStatus((prev) => ({ ...prev, polygon: "error" }))
    }

    setIsRefreshing(false)
  }

  const runSetup = async () => {
    try {
      const response = await fetch("/api/setup", { method: "POST" })
      const result = await response.json()

      if (result.success) {
        toast({
          title: "Setup Complete!",
          description: "Database tables created and sample data added successfully.",
        })
        checkConnections()
      } else {
        toast({
          title: "Setup Failed",
          description: result.error || "Please run the SQL scripts manually.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Setup Error",
        description: "Please run the SQL scripts manually in your Supabase dashboard.",
        variant: "destructive",
      })
    }
  }

  const getStatusIcon = (connectionStatus: string) => {
    switch (connectionStatus) {
      case "connected":
      case "ready":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "needs-setup":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      default:
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
    }
  }

  const getStatusColor = (connectionStatus: string) => {
    switch (connectionStatus) {
      case "connected":
      case "ready":
        return "bg-green-100 text-green-800"
      case "error":
        return "bg-red-100 text-red-800"
      case "needs-setup":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-blue-100 text-blue-800"
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          System Status
          <Button variant="outline" size="sm" onClick={checkConnections} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>Verify all system connections are working properly</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="font-medium">Supabase</div>
              <div className="text-sm text-muted-foreground">Database Connection</div>
            </div>
            <Badge variant="secondary" className={getStatusColor(status.supabase)}>
              <div className="flex items-center gap-1">
                {getStatusIcon(status.supabase)}
                {status.supabase === "connected" ? "Connected" : status.supabase === "error" ? "Error" : "Checking..."}
              </div>
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="font-medium">Polygon.io</div>
              <div className="text-sm text-muted-foreground">Market Data API</div>
            </div>
            <Badge variant="secondary" className={getStatusColor(status.polygon)}>
              <div className="flex items-center gap-1">
                {getStatusIcon(status.polygon)}
                {status.polygon === "connected" ? "Connected" : status.polygon === "error" ? "Error" : "Checking..."}
              </div>
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="font-medium">Database</div>
              <div className="text-sm text-muted-foreground">Tables & Schema</div>
            </div>
            <Badge variant="secondary" className={getStatusColor(status.database)}>
              <div className="flex items-center gap-1">
                {getStatusIcon(status.database)}
                {status.database === "ready"
                  ? "Ready"
                  : status.database === "needs-setup"
                    ? "Setup Required"
                    : status.database === "error"
                      ? "Error"
                      : "Checking..."}
              </div>
            </Badge>
          </div>
        </div>

        {status.database === "needs-setup" && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="font-medium text-yellow-800">Database Setup Required</span>
            </div>
            <p className="text-sm text-yellow-700 mb-3">
              Your Supabase connection is working, but the database tables need to be created.
            </p>

            <div className="flex gap-2 mb-3">
              <Button onClick={runSetup} size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                Auto Setup Database
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open("https://einiudectbjfwhkxnntq.supabase.co", "_blank")}
              >
                Open Supabase Dashboard
              </Button>
            </div>

            <div className="text-xs text-yellow-600">
              <p>
                <strong>Manual Setup:</strong>
              </p>
              <p>1. Go to your Supabase dashboard → SQL Editor</p>
              <p>2. Run scripts/001-create-tables.sql</p>
              <p>3. Run scripts/002-seed-sample-data.sql</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
