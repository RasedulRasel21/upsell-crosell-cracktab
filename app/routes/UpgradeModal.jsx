import { useState } from "react";
import { useFetcher } from "@remix-run/react";
import {
  Modal,
  Text,
  BlockStack,
  Button,
  List,
  InlineStack,
  Badge,
} from "@shopify/polaris";

export default function UpgradeModal({ isOpen, onClose }) {
  const fetcher = useFetcher();
  const isLoading = fetcher.state === "submitting";

  const handleUpgrade = () => {
    const formData = new FormData();
    formData.append("actionType", "subscribe");
    fetcher.submit(formData, { 
      method: "POST",
      action: "/app/billing"
    });
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Upgrade to Pro Plan"
      primaryAction={{
        content: isLoading ? "Setting up..." : "Upgrade Now - $10/month",
        onAction: handleUpgrade,
        loading: isLoading,
      }}
      secondaryActions={[
        {
          content: "Maybe later",
          onAction: onClose,
          disabled: isLoading,
        },
      ]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Text variant="bodyMd">
            You've reached your free limit of 100 bulk operations this month. 
            Upgrade to Pro to continue using bulk tag management features.
          </Text>

          <BlockStack gap="300">
            <Text variant="headingMd" as="h3">
              Pro Plan Benefits:
            </Text>
            
            <List>
              <List.Item>
                <InlineStack gap="200" align="space-between">
                  <Text>Unlimited bulk operations</Text>
                  <Badge tone="success">✓</Badge>
                </InlineStack>
              </List.Item>
              <List.Item>
                <InlineStack gap="200" align="space-between">
                  <Text>Priority support</Text>
                  <Badge tone="success">✓</Badge>
                </InlineStack>
              </List.Item>
              <List.Item>
                <InlineStack gap="200" align="space-between">
                  <Text>Advanced analytics</Text>
                  <Badge tone="success">✓</Badge>
                </InlineStack>
              </List.Item>
              <List.Item>
                <InlineStack gap="200" align="space-between">
                  <Text>Export tag reports</Text>
                  <Badge tone="success">✓</Badge>
                </InlineStack>
              </List.Item>
            </List>
          </BlockStack>

          <Text variant="bodyMd" color="subdued">
            Cancel anytime. You'll keep Pro features until the end of your billing period.
          </Text>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}