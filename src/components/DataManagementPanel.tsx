import { useCallback, useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Download, Database, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { dataSync, getDataSource } from '../utils/dataSync';
import { toast } from 'sonner';
import { Alert, AlertDescription } from './ui/alert';

export function DataManagementPanel() {
  const [isChecking, setIsChecking] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [healthStatus, setHealthStatus] = useState<Awaited<ReturnType<typeof dataSync.checkNeonHealth>> | null>(null);
  const [totalDatabaseProducts, setTotalDatabaseProducts] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(true);
  const dataSource = getDataSource();

  const checkConnection = useCallback(async () => {
    setIsChecking(true);
    const result = await dataSync.checkNeonHealth();
    setHealthStatus(result);
    setTotalDatabaseProducts(result.available ? result.productCount : null);
    setIsChecking(false);
    return result;
  }, []);

  useEffect(() => {
    let active = true;
    dataSync.checkNeonHealth().then((result) => {
      if (!active) return;
      setHealthStatus(result);
      setTotalDatabaseProducts(result.available ? result.productCount : null);
      setIsLoadingCount(false);
    });
    return () => { active = false; };
  }, []);

  const handleHealthCheck = async () => {
    const result = await checkConnection();
    if (result.available) {
      toast.success(`Neon Postgres connected — ${result.productCount} products`);
    } else {
      toast.error(result.message);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    const result = await dataSync.exportToCSV();
    setIsExporting(false);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>Check and export catalog data from Neon Postgres</CardDescription>
          </div>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            <Database className="h-3 w-3 mr-1" />
            Neon Postgres
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {healthStatus && (
          <Alert className={healthStatus.available ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
            {healthStatus.available ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <AlertDescription className={healthStatus.available ? 'text-green-800' : 'text-red-800'}>
              <strong>{healthStatus.message}</strong>
              {healthStatus.available && (
                <p className="text-sm mt-1">Neon catalog contains {healthStatus.productCount} products</p>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Neon Catalog Products</p>
                <p className="text-2xl font-bold text-[#003366]">
                  {isLoadingCount ? '...' : totalDatabaseProducts ?? '—'}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Data Source</p>
                <Badge className="mt-1 bg-[#003366]">{dataSource}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={handleHealthCheck} disabled={isChecking}>
            {isChecking ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Checking...</>
            ) : (
              <><Database className="h-4 w-4 mr-2" />Check Neon Connection</>
            )}
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Exporting...</>
            ) : (
              <><Download className="h-4 w-4 mr-2" />Export Neon CSV</>
            )}
          </Button>
        </div>

        <Alert className="bg-blue-50 border-blue-200">
          <Database className="h-4 w-4 text-blue-700" />
          <AlertDescription className="text-blue-800">
            Product creation and CSV imports are managed from the Product Catalog and require an authenticated Neon administrator. This panel is read-only; it does not copy legacy Supabase data.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
