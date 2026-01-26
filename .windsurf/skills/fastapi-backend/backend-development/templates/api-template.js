/**
 * {{APIName}} API Controller
 * 
 * @description {{description}}
 * @author {{author}}
 * @created {{date}}
 */

const { createClient } = require('@supabase/supabase-js');
const { validationResult } = require('express-validator');

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * GET /api/{{routeName}}
 * Get all {{resourceName}}
 */
exports.getAll{{ResourceName}} = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('{{tableName}}')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to fetch {{resourceName}}',
        error: error.message
      });
    }

    res.status(200).json({
      success: true,
      data,
      message: '{{ResourceName}} fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * GET /api/{{routeName}}/:id
 * Get {{resourceName}} by ID
 */
exports.get{{ResourceName}}ById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('{{tableName}}')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        message: '{{ResourceName}} not found',
        error: error.message
      });
    }

    res.status(200).json({
      success: true,
      data,
      message: '{{ResourceName}} fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * POST /api/{{routeName}}
 * Create new {{resourceName}}
 */
exports.create{{ResourceName}} = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {{resourceName}}Data = {
      ...req.body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('{{tableName}}')
      .insert({{resourceName}}Data)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to create {{resourceName}}',
        error: error.message
      });
    }

    res.status(201).json({
      success: true,
      data,
      message: '{{ResourceName}} created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * PUT /api/{{routeName}}/:id
 * Update {{resourceName}}
 */
exports.update{{ResourceName}} = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('{{tableName}}')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to update {{resourceName}}',
        error: error.message
      });
    }

    res.status(200).json({
      success: true,
      data,
      message: '{{ResourceName}} updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * DELETE /api/{{routeName}}/:id
 * Delete {{resourceName}}
 */
exports.delete{{ResourceName}} = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('{{tableName}}')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to delete {{resourceName}}',
        error: error.message
      });
    }

    res.status(200).json({
      success: true,
      message: '{{ResourceName}} deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
