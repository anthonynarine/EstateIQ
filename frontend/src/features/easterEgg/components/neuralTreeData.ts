// # Filename: src/features/fun/components/neuralTreeData.ts
// ✅ New Code

import type { NeuralTreeNode } from "./neuralTreeTypes";

export const NEURAL_TREE: NeuralTreeNode = {
  id: "TenantsPage",
  type: "root",
  children: [
    {
      id: "useTenants",
      type: "hook",
      children: [
        { id: "useFilter", type: "hook", children: [] },
        { id: "usePagination", type: "hook", children: [] },
        { id: "useSort", type: "hook", children: [] },
      ],
    },
    {
      id: "usePermissions",
      type: "hook",
      children: [
        { id: "useRoles", type: "hook", children: [] },
        { id: "useACL", type: "hook", children: [] },
      ],
    },
    {
      id: "TenantListSection",
      type: "section",
      children: [
        { id: "SearchBar", type: "leaf", children: [] },
        {
          id: "FilterPanel",
          type: "section",
          children: [
            { id: "StatusFilter", type: "leaf", children: [] },
            { id: "DateRangeFilter", type: "leaf", children: [] },
            { id: "PlanFilter", type: "leaf", children: [] },
          ],
        },
        {
          id: "TenantTable",
          type: "section",
          children: [
            { id: "TableHeader", type: "leaf", children: [] },
            { id: "TableRow", type: "leaf", children: [] },
            { id: "Pagination", type: "leaf", children: [] },
          ],
        },
        { id: "BulkActionBar", type: "leaf", children: [] },
      ],
    },
    {
      id: "TenantDetailPanel",
      type: "section",
      children: [
        { id: "TenantHeader", type: "leaf", children: [] },
        {
          id: "TenantTabs",
          type: "section",
          children: [
            { id: "OverviewTab", type: "leaf", children: [] },
            { id: "UsersTab", type: "leaf", children: [] },
            { id: "BillingTab", type: "leaf", children: [] },
            { id: "AuditTab", type: "leaf", children: [] },
          ],
        },
        { id: "TenantMetrics", type: "leaf", children: [] },
      ],
    },
    {
      id: "CreateTenantForm",
      type: "form",
      children: [
        { id: "NameField", type: "leaf", children: [] },
        { id: "PlanSelector", type: "leaf", children: [] },
        { id: "AdminEmailField", type: "leaf", children: [] },
        { id: "SubmitBtn", type: "leaf", children: [] },
      ],
    },
    {
      id: "EditTenantModal",
      type: "modal",
      children: [
        { id: "ModalHeader", type: "leaf", children: [] },
        {
          id: "EditForm",
          type: "form",
          children: [
            { id: "EditNameField", type: "leaf", children: [] },
            { id: "EditStatusField", type: "leaf", children: [] },
            { id: "EditPlanField", type: "leaf", children: [] },
          ],
        },
        { id: "ModalActions", type: "leaf", children: [] },
      ],
    },
    {
      id: "DeleteConfirmModal",
      type: "modal",
      children: [
        { id: "WarningIcon", type: "leaf", children: [] },
        { id: "ConfirmMessage", type: "leaf", children: [] },
        { id: "CancelBtn", type: "leaf", children: [] },
        { id: "ConfirmBtn", type: "leaf", children: [] },
      ],
    },
    { id: "NotificationToast", type: "leaf", children: [] },
    { id: "LoadingOverlay", type: "leaf", children: [] },
  ],
};