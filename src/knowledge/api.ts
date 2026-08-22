// @ts-nocheck
import { KnowledgeGraph } from './source-graph.js';

export function createKnowledgeService() {
  const graph = new KnowledgeGraph();
  return {
    graph,
    add: input => graph.add(input),
    search: query => graph.search(query),
    get: id => graph.get(id),
    graphFor: id => graph.graph(id),
    link: input => graph.link(input)
  };
}
