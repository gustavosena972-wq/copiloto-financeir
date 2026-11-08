"""Build only the institutional web pages; never upload the repository root."""
import pathlib
import shutil

PUBLIC_FILES = ("index.html", "privacidade.html", "termos.html", "excluir-conta.html")

def build(root):
    root = pathlib.Path(root).resolve()
    output = root / "_site"
    # Validate the absolute target before removing the previous generated package.
    if output.is_symlink() or output.resolve().parent != root:
        raise ValueError("Unsafe web output directory")
    for name in PUBLIC_FILES:
        if not (root / name).is_file():
            raise FileNotFoundError(name)
    if output.exists():
        shutil.rmtree(output)
    output.mkdir()
    for name in PUBLIC_FILES:
        shutil.copyfile(root / name, output / name)
    return output

if __name__ == "__main__":
    print(build(pathlib.Path(__file__).resolve().parents[1]))
