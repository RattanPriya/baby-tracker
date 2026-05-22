import Constants from 'expo-constants';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import Purchases from 'react-native-purchases';

export const PLUS_ENTITLEMENT_ID = 'baby_tracker_plus';
export const PLUS_MONTHLY_PRODUCT_ID = 'baby_tracker_plus_monthly';

const EntitlementContext = createContext(null);

function getRevenueCatApiKey() {
  return (
    Constants.expoConfig?.extra?.revenueCatIosApiKey ||
    Constants.manifest?.extra?.revenueCatIosApiKey ||
    ''
  );
}

function hasPlusEntitlement(customerInfo) {
  return Boolean(customerInfo?.entitlements?.active?.[PLUS_ENTITLEMENT_ID]);
}

function findMonthlyPackage(offerings) {
  const packages = offerings?.current?.availablePackages || [];
  return (
    packages.find((item) => item.product?.identifier === PLUS_MONTHLY_PRODUCT_ID) ||
    packages.find((item) => item.identifier?.toLowerCase().includes('monthly')) ||
    packages[0] ||
    null
  );
}

export function EntitlementProvider({ children }) {
  const apiKey = getRevenueCatApiKey();
  const configured = Boolean(apiKey);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [offerings, setOfferings] = useState(null);
  const [loading, setLoading] = useState(Boolean(apiKey));
  const [error, setError] = useState(null);

  async function refresh() {
    if (!configured) {
      setLoading(false);
      return null;
    }

    try {
      setLoading(true);
      const [nextCustomerInfo, nextOfferings] = await Promise.all([
        Purchases.getCustomerInfo(),
        Purchases.getOfferings(),
      ]);
      setCustomerInfo(nextCustomerInfo);
      setOfferings(nextOfferings);
      setError(null);
      return { customerInfo: nextCustomerInfo, offerings: nextOfferings };
    } catch (purchaseError) {
      setError(purchaseError);
      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function bootPurchases() {
      if (!configured) {
        setLoading(false);
        return;
      }

      try {
        Purchases.configure({ apiKey });
        const nextCustomerInfo = await Purchases.getCustomerInfo();
        const nextOfferings = await Purchases.getOfferings();
        if (!mounted) return;
        setCustomerInfo(nextCustomerInfo);
        setOfferings(nextOfferings);
        setError(null);
      } catch (purchaseError) {
        if (!mounted) return;
        setError(purchaseError);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    bootPurchases();

    return () => {
      mounted = false;
    };
  }, [apiKey, configured]);

  useEffect(() => {
    if (!configured) return undefined;
    const listener = (nextCustomerInfo) => setCustomerInfo(nextCustomerInfo);
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => Purchases.removeCustomerInfoUpdateListener(listener);
  }, [configured]);

  const monthlyPackage = useMemo(() => findMonthlyPackage(offerings), [offerings]);

  async function purchaseMonthly() {
    if (!configured) {
      throw new Error('RevenueCat is not configured. Add a RevenueCat iOS API key before testing purchases.');
    }
    if (!monthlyPackage) {
      const refreshed = await refresh();
      const refreshedPackage = findMonthlyPackage(refreshed?.offerings);
      if (refreshedPackage) {
        const purchaseResult = await Purchases.purchasePackage(refreshedPackage);
        setCustomerInfo(purchaseResult.customerInfo);
        return purchaseResult.customerInfo;
      }
    }
    const packageToBuy = monthlyPackage || findMonthlyPackage(offerings);
    if (!packageToBuy) {
      throw new Error('No Baby Tracker Plus monthly product is available yet. Check App Store Connect and RevenueCat offerings.');
    }
    const purchaseResult = await Purchases.purchasePackage(packageToBuy);
    setCustomerInfo(purchaseResult.customerInfo);
    return purchaseResult.customerInfo;
  }

  async function restorePurchases() {
    if (!configured) {
      throw new Error('RevenueCat is not configured. Add a RevenueCat iOS API key before testing restore purchases.');
    }
    const nextCustomerInfo = await Purchases.restorePurchases();
    setCustomerInfo(nextCustomerInfo);
    return nextCustomerInfo;
  }

  const value = useMemo(() => ({
    configured,
    customerInfo,
    error,
    isPlus: hasPlusEntitlement(customerInfo),
    loading,
    monthlyPackage,
    purchaseMonthly,
    refresh,
    restorePurchases,
  }), [configured, customerInfo, error, loading, monthlyPackage]);

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
}

export function usePlusAccess() {
  const context = useContext(EntitlementContext);
  if (!context) {
    throw new Error('usePlusAccess must be used inside EntitlementProvider');
  }
  return context;
}
