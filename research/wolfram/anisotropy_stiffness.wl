(* Crystallization Apocalypse — anisotropic surface energy audit
   Analytical reference generated with the Wolfram MCP Language Evaluator
   2026-11-13. Stateless: run the whole file in a fresh Wolfram kernel.
   This is NOT a phase-field simulation and is NOT the A.2 tip model.
*)
ClearAll[theta, epsilon, n, gamma, stiffness, folds, thresholds, examples];
gamma = 1 + epsilon Cos[n theta];
stiffness = FullSimplify[gamma + D[gamma, {theta, 2}]];
folds = {4, 6, 8};
thresholds = Table[
  <|"folds" -> k, "criticalEpsilonExact" -> 1/(k^2 - 1),
    "criticalEpsilon" -> N[1/(k^2 - 1), 10]|>,
  {k, folds}
];
examples = Flatten[Table[
  <|"folds" -> k, "epsilon" -> e,
    "minimumStiffness" -> N[1 - e (k^2 - 1), 8],
    "someOrientationsNegative" -> TrueQ[e (k^2 - 1) > 1]|>,
  {k, folds}, {e, {1/100, 1/40, 1/20}}
], 1];
<|
  "surfaceEnergy" -> gamma,
  "surfaceStiffness" -> stiffness,
  "criticalThresholds" -> thresholds,
  "examples" -> examples
|>
