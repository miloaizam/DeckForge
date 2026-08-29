import { Navbar } from "@/components/Navbar";

/**
 * Layout de las paginas internas. La portada queda fuera de este grupo, asi
 * que su HTML no lleva navbar: no es que se oculte con CSS.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
