import { examples, registry } from "@penrose/examples";
import { genCode, makeGraph, secondaryGraph } from "engine/Autodiff";
import * as fs from "fs";
import { compileTrio, prepareState, resample, showError } from "index";
import * as ad from "types/ad";
import { safe } from "utils/Util";

const stringifyGraph = ({ graph, primary }: ad.Graph) => {
  const [node0, ...nodes] = graph.nodes();
  const strings = [
    `{\n  "primary": ${JSON.stringify(
      primary
    )},\n  "nodes": {\n    ${JSON.stringify(node0)}: ${JSON.stringify(
      graph.node(node0)
    )}`,
  ];
  for (const id of nodes) {
    strings.push(
      `,\n    ${JSON.stringify(id)}: ${JSON.stringify(graph.node(id))}`
    );
  }

  const [edge0, ...edges] = graph.edges();
  strings.push(`\n  },\n  "edges": [\n    ${JSON.stringify(edge0)}`);
  for (const edge of edges) {
    strings.push(`,\n    ${JSON.stringify(edge)}`);
  }
  strings.push("\n  ]\n}\n");

  return strings.join("");
};

export const fuzz = async (): Promise<void> => {
  const setTheory = examples["set-theory-domain"];
  const dslSet = setTheory["setTheory.dsl"];
  const styVenn = setTheory["venn.sty"];
  const subTree = setTheory["tree.sub"];
  const variation = safe(
    registry.trios.find(
      ({ substance, style }) => substance === "tree" && style === "venn"
    ),
    "tree-venn should exist"
  ).variation;

  const res = compileTrio({
    substance: subTree,
    style: styVenn,
    domain: dslSet,
    variation,
  });
  if (!res.isOk()) {
    throw Error(showError(res.error));
  }

  // resample because initial sampling did not use the special sampling seed
  const {
    params: { energyGraph },
  } = resample(await prepareState(res.value));

  const g1 = secondaryGraph([energyGraph]);
  fs.writeFileSync("graph.json", stringifyGraph(g1), "utf8");
  const pairs = [...g1.nodes.entries()];

  const g2 = makeGraph({
    primary: energyGraph,
    secondary: pairs.map(([v]) => v),
  });
  const f = genCode(g2);

  const inputs = [];
  for (const [v] of pairs) {
    if (typeof v !== "number" && v.tag === "Input") {
      inputs[v.index] = v.val;
    }
  }
  const outputs = f(inputs);

  const secondary = Object.fromEntries(
    pairs.map(([, id], i) => [id, outputs.secondary[i]])
  );
  fs.writeFileSync(
    "outputs.json",
    `${JSON.stringify({ ...outputs, secondary }, null, 2)}\n`,
    "utf8"
  );
};
