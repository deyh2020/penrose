import { makeCanvas } from "./Samplers";
import { shapedefs } from "./Shapes";

describe("constructors", () => {
  test("print", () => {
    const canvas = makeCanvas(800, 700);
    console.log(
      Object.fromEntries(
        Object.entries(shapedefs).map(([name, { constr }]) => {
          const shape: { [prop: string]: any } = constr(canvas, {});
          delete shape.shapeType;
          delete shape.bbox;
          const types = Object.fromEntries(
            Object.entries(shape).map(([prop, { tag }]) => [prop, tag])
          );
          return [name, types];
        })
      )
    );
  });
});
