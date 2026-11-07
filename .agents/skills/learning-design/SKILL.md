---
name: learning-design
description: Review all PostgreSQL Lab changes for learning progression, accurate experiments, and meaningful learner feedback.
---

# Learning design review

Apply before implementation and again after running the experiments. No additional approval is
required by this skill.

1. State a practical question and observable learning goals. Name prerequisites and runtime needs.
2. Use a realistic incident and a dataset whose relevant properties the learner can inspect.
3. Ask the learner to predict before running SQL, inspect evidence, change one thing, and explain
   the outcome. Include transfer questions that require reasoning beyond copying the example.
4. Define technical terms before using them to explain a result. Tie explanations to actual output.
5. Provide progressive hints and worked explanations behind disclosure controls. Describe what a
   good answer includes. Do not grade exact timings, exact plan shapes, or version-specific costs.
6. Execute every SQL block in order from the documented initial state. Verify data invariants and
   important semantic outcomes. Ensure the solution remains correct even if the planner chooses
   another valid path. Explain sampling and environmental variation.
7. Make state explicit: experiments share a database within a page, page changes start fresh,
   restore SQL does not restore data, and reset discards database changes.
8. Give outlines a purpose, prerequisites, planned experiment, evidence to inspect, and success
   criteria. Label them honestly. Keep browser and future server tracks distinct.
9. Check the next chapter follows from the current question. Cite primary PostgreSQL documentation.

Record a concise review of progression, executed evidence, transfer tasks, and limitations.
