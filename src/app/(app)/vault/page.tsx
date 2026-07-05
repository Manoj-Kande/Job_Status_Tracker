import { Topbar } from "@/components/layout/topbar";
import { VaultProvider } from "@/components/vault/vault-provider";
import { VaultQuickAdd } from "@/components/vault/vault-quick-add";
import { VaultSearch } from "@/components/vault/vault-search";
import { VaultTree } from "@/components/vault/vault-tree";
import { getVaultData } from "@/lib/vault-queries";

export default async function VaultPage() {
  const data = await getVaultData();

  return (
    <>
      <Topbar title="Vault" />
      <main className="flex-1 space-y-4 p-4 pb-20 md:p-6 md:pb-6">
        <VaultProvider initial={data}>
          <VaultQuickAdd />
          <VaultSearch />
          <VaultTree />
        </VaultProvider>
      </main>
    </>
  );
}
