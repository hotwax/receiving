interface TransferOrderDetailReceiveWorkflowOptions {
  startConfirmation: () => boolean;
  startSubmission: () => boolean;
  reset: () => void;
  confirm: () => Promise<boolean>;
  submit: () => Promise<boolean>;
  navigate: () => Promise<void>;
  onSubmissionStart?: () => void;
  onSubmissionEnd?: () => void;
}

export const runTransferOrderDetailReceiveWorkflow = async ({
  startConfirmation,
  startSubmission,
  reset,
  confirm,
  submit,
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

      await navigate();

      return true;
    } finally {
      onSubmissionEnd?.();
    }
  } finally {
    reset();
  }
};
