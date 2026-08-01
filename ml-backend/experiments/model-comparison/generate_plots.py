"""
generate_plots.py

Reads results/model_comparison_results.csv (produced by compare_models.py)
and writes the required comparison plots to results/plots/. Read-only with
respect to the benchmark results — does not re-run any models.

Run: python generate_plots.py   (after compare_models.py has produced
results/model_comparison_results.csv)
"""

import os

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import pandas as pd

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
RESULTS_CSV = os.path.join(THIS_DIR, 'results', 'model_comparison_results.csv')
PLOTS_DIR = os.path.join(THIS_DIR, 'results', 'plots')

MODEL_ORDER = ['LogisticRegression', 'DecisionTree', 'RandomForest', 'XGBoost', 'CatBoost']
COLORS = {
    'LogisticRegression': '#4C72B0',
    'DecisionTree': '#DD8452',
    'RandomForest': '#55A868',
    'XGBoost': '#C44E52',
    'CatBoost': '#8172B2',
}


def _bar_with_error(df, metric, ylabel, title, out_path):
    agg = df.groupby('Model')[metric].agg(['mean', 'std']).reindex(MODEL_ORDER)

    fig, ax = plt.subplots(figsize=(8, 5.5))
    bars = ax.bar(
        agg.index, agg['mean'], yerr=agg['std'], capsize=5,
        color=[COLORS[m] for m in agg.index], edgecolor='black', linewidth=0.6,
    )
    ax.set_ylabel(ylabel)
    ax.set_title(title)
    ax.set_xlabel('Model')
    ax.yaxis.grid(True, linestyle='--', alpha=0.4)
    ax.set_axisbelow(True)
    for bar, mean in zip(bars, agg['mean']):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height(),
                f'{mean:.3f}', ha='center', va='bottom', fontsize=9)
    plt.xticks(rotation=15)
    plt.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)
    print(f"Wrote {out_path}")


def _boxplot_variance(df, metric, ylabel, title, out_path):
    data = [df[df['Model'] == m][metric].dropna().values for m in MODEL_ORDER]

    fig, ax = plt.subplots(figsize=(8, 5.5))
    bp = ax.boxplot(data, tick_labels=MODEL_ORDER, patch_artist=True)
    for patch, model in zip(bp['boxes'], MODEL_ORDER):
        patch.set_facecolor(COLORS[model])
        patch.set_alpha(0.6)
    ax.set_ylabel(ylabel)
    ax.set_title(title)
    ax.set_xlabel('Model')
    ax.yaxis.grid(True, linestyle='--', alpha=0.4)
    ax.set_axisbelow(True)
    plt.xticks(rotation=15)
    plt.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)
    print(f"Wrote {out_path}")


def main():
    df = pd.read_csv(RESULTS_CSV)
    df = df.dropna(subset=['Accuracy'])  # drop any errored (antibiotic, model) rows

    os.makedirs(PLOTS_DIR, exist_ok=True)

    _bar_with_error(
        df, 'Accuracy', 'Accuracy',
        'Mean Accuracy by Model (± std across 15 antibiotics)',
        os.path.join(PLOTS_DIR, 'accuracy.png'),
    )
    _bar_with_error(
        df, 'F1_Macro', 'Macro F1 Score',
        'Mean Macro F1 by Model (± std across 15 antibiotics)',
        os.path.join(PLOTS_DIR, 'f1_score.png'),
    )
    _bar_with_error(
        df, 'Train_Time_Sec', 'Training Time (seconds, per outer fold, mean)',
        'Mean Training Time by Model (± std across 15 antibiotics)',
        os.path.join(PLOTS_DIR, 'training_time.png'),
    )
    _boxplot_variance(
        df, 'F1_Macro', 'Macro F1 Score',
        'Per-Model Macro F1 Consistency Across the 15 Antibiotics',
        os.path.join(PLOTS_DIR, 'f1_macro_variance_boxplot.png'),
    )


if __name__ == '__main__':
    main()
