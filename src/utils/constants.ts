import { FlowContext, FlowDocument } from "../types/MessageProtocol";

export const defaultContext: FlowContext = {
  cwd: "~",
  branch: "main",
  shell: "bash",
};

export const defaultDoc: FlowDocument = {
  layout: "grid",
  variables: {},
  blocks: [],
  context: defaultContext,
};
