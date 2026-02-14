import React from "react";

export const ComponentShowcase: React.FC = () => {
  return (
    <div className="p-8 space-y-8 bg-vscode-background text-vscode-foreground">
      {/* Buttons */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold border-b border-vscode-border pb-2">
          Buttons
        </h3>
        <div className="flex flex-wrap gap-3">
          <button className="btn-vscode">Primary Button</button>
          <button className="btn-vscode-secondary">Secondary Button</button>
          <button className="btn-vscode-icon">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <button className="btn-vscode btn-vscode-sm">Small</button>
          <button className="btn-vscode btn-vscode-lg">Large</button>
          <button className="btn-vscode" disabled>
            Disabled
          </button>
        </div>
      </section>

      {/* Inputs */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold border-b border-vscode-border pb-2">
          Inputs
        </h3>
        <div className="space-y-3 max-w-md">
          <input
            type="text"
            className="input-vscode"
            placeholder="Normal input"
          />
          <input
            type="text"
            className="input-vscode input-vscode-error"
            placeholder="Error input"
          />
          <input
            type="text"
            className="input-vscode input-vscode-warning"
            placeholder="Warning input"
          />
          <input
            type="text"
            className="input-vscode"
            disabled
            placeholder="Disabled input"
          />
        </div>
      </section>

      {/* Select */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold border-b border-vscode-border pb-2">
          Select
        </h3>
        <div className="max-w-md">
          <select className="select-vscode">
            <option>Option 1</option>
            <option>Option 2</option>
            <option>Option 3</option>
          </select>
        </div>
      </section>

      {/* Checkboxes & Radios */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold border-b border-vscode-border pb-2">
          Checkboxes & Radios
        </h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="checkbox-vscode" />
            <span>Checkbox option</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="radio-group" className="radio-vscode" />
            <span>Radio option 1</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="radio-group" className="radio-vscode" />
            <span>Radio option 2</span>
          </label>
        </div>
      </section>

      {/* Badges */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold border-b border-vscode-border pb-2">
          Badges
        </h3>
        <div className="flex gap-2">
          <span className="badge-vscode">New</span>
          <span className="badge-vscode">Beta</span>
          <span className="badge-vscode">3</span>
        </div>
      </section>

      {/* Menu */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold border-b border-vscode-border pb-2">
          Menu
        </h3>
        <div className="menu-vscode max-w-xs">
          <div className="menu-item-vscode">Copy Output</div>
          <div className="menu-item-vscode">Pin Command</div>
          <div className="menu-separator-vscode" />
          <div className="menu-item-vscode text-vscode-error">Kill Process</div>
        </div>
      </section>

      {/* List */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold border-b border-vscode-border pb-2">
          List Items
        </h3>
        <div className="border border-vscode-border rounded-vscode overflow-hidden max-w-md">
          <div className="list-item-vscode">Normal Item</div>
          <div className="list-item-vscode list-item-vscode-active">
            Active Item
          </div>
          <div className="list-item-vscode">Another Item</div>
        </div>
      </section>

      {/* Cards */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold border-b border-vscode-border pb-2">
          Cards & Panels
        </h3>
        <div className="grid grid-cols-2 gap-4 max-w-2xl">
          <div className="card-vscode">
            <h4 className="font-semibold mb-2">Card Title</h4>
            <p className="text-sm text-vscode-secondary">
              Card content goes here
            </p>
          </div>
          <div className="panel-vscode p-4">
            <h4 className="font-semibold mb-2">Panel Title</h4>
            <p className="text-sm text-vscode-secondary">
              Panel content goes here
            </p>
          </div>
        </div>
      </section>

      {/* Terminal Block */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold border-b border-vscode-border pb-2">
          Terminal Block
        </h3>
        <div className="terminal-block">
          <div className="status-success">$ npm install</div>
          <div className="text-vscode-secondary">added 142 packages in 5s</div>
          <div className="status-error">ERROR: Module not found</div>
        </div>
      </section>

      {/* Code */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold border-b border-vscode-border pb-2">
          Code
        </h3>
        <div>
          Use <code className="code-vscode">npm install</code> to install
          dependencies.
        </div>
      </section>
    </div>
  );
};
