export type TransferOrderReceiveMode = 'save-progress' | 'complete';

interface TransferOrderDetailReceiveWorkflowOptions {
  mode: TransferOrderReceiveMode;
  startConfirmation: () => boolean;
  startSubmission: () => boolean;
  reset: () => void;
  confirm: () => Promise<boolean>;
  submit: () => Promise<boolean>;
  refresh: () => Promise<void>;
  navigate: () => Promise<void>;
  onSubmissionStart?: () => void;
  onSubmissionEnd?: () => void;
}

export const runTransferOrderDetailReceiveWorkflow = async ({
  mode,
  startConfirmation,
  startSubmission,
  reset,
  confirm,
  submit,
  refresh,
  navigate,
  onSubmissionStart,
  onSubmissionEnd
}: TransferOrderDetailReceiveWorkflowOptions) => {
  if (!startConfirmation()) {
    return false;
  }

  try {
    if (!await confirm() || !startSubmission()) {
      return false;
    }

    onSubmissionStart?.();
    try {
      if (!await submit()) {
        return false;
      }

      if (mode === 'save-progress') {
        await refresh();
      } else {
        await navigate();
      }

      return true;
    } finally {
      onSubmissionEnd?.();
    }
  } finally {
    reset();
  }
};
